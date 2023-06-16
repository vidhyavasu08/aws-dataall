import json
import logging

from botocore.exceptions import ClientError
from pyathena import connect

from dataall import db
from dataall.modules.datasets.api.dataset.resolvers import get_dataset
from dataall.api.context import Context
from dataall.aws.handlers.service_handlers import Worker
from dataall.aws.handlers.sts import SessionHelper
from dataall.db import models
from dataall.db.api import ResourcePolicy, Glossary
from dataall.modules.datasets.db.models import DatasetTable, Dataset
from dataall.modules.datasets.services.dataset_service import DatasetService
from dataall.modules.datasets.services.dataset_permissions import UPDATE_DATASET_TABLE, PREVIEW_DATASET_TABLE
from dataall.utils import json_utils
from dataall.modules.datasets.indexers.table_indexer import DatasetTableIndexer
from dataall.modules.datasets.services.dataset_table_service import DatasetTableService

log = logging.getLogger(__name__)


def create_table(context, source, datasetUri: str = None, input: dict = None):
    with context.engine.scoped_session() as session:
        table = DatasetTableService.create_dataset_table(
            session=session,
            uri=datasetUri,
            data=input,
        )
        DatasetTableIndexer.upsert(session, table_uri=table.tableUri)
    return table


def list_dataset_tables(context, source, filter: dict = None):
    if not source:
        return None
    if not filter:
        filter = {}
    with context.engine.scoped_session() as session:
        return DatasetTableService.list_dataset_tables(
            session=session,
            uri=source.datasetUri,
            data=filter,
        )


def get_table(context, source: Dataset, tableUri: str = None):
    with context.engine.scoped_session() as session:
        table = DatasetTableService.get_dataset_table_by_uri(session, tableUri)
        return DatasetTableService.get_dataset_table(
            session=session,
            uri=table.datasetUri,
            data={
                'tableUri': tableUri,
            },
        )


def update_table(context, source, tableUri: str = None, input: dict = None):
    with context.engine.scoped_session() as session:
        table = DatasetTableService.get_dataset_table_by_uri(session, tableUri)

        dataset = DatasetService.get_dataset_by_uri(session, table.datasetUri)

        input['table'] = table
        input['tableUri'] = table.tableUri

        DatasetTableService.update_dataset_table(
            session=session,
            uri=dataset.datasetUri,
            data=input,
        )
        DatasetTableIndexer.upsert(session, table_uri=table.tableUri)
    return table


def delete_table(context, source, tableUri: str = None):
    with context.engine.scoped_session() as session:
        table = DatasetTableService.get_dataset_table_by_uri(session, tableUri)
        DatasetTableService.delete_dataset_table(
            session=session,
            uri=table.datasetUri,
            data={
                'tableUri': tableUri,
            },
        )
    DatasetTableIndexer.delete_doc(doc_id=tableUri)
    return True


def preview(context, source, tableUri: str = None):
    with context.engine.scoped_session() as session:
        table: DatasetTable = DatasetTableService.get_dataset_table_by_uri(
            session, tableUri
        )
        dataset = DatasetService.get_dataset_by_uri(session, table.datasetUri)
        if (
            dataset.confidentiality
            != models.ConfidentialityClassification.Unclassified.value
        ):
            ResourcePolicy.check_user_resource_permission(
                session=session,
                username=context.username,
                groups=context.groups,
                resource_uri=table.tableUri,
                permission_name=PREVIEW_DATASET_TABLE,
            )
        env = db.api.Environment.get_environment_by_uri(session, dataset.environmentUri)
        env_workgroup = {}
        boto3_session = SessionHelper.remote_session(accountid=table.AWSAccountId)
        creds = boto3_session.get_credentials()
        try:
            env_workgroup = boto3_session.client(
                'athena', region_name=env.region
            ).get_work_group(WorkGroup=env.EnvironmentDefaultAthenaWorkGroup)
        except ClientError as e:
            log.info(
                f'Workgroup {env.EnvironmentDefaultAthenaWorkGroup} can not be found'
                f'due to: {e}'
            )

        connection = connect(
            aws_access_key_id=creds.access_key,
            aws_secret_access_key=creds.secret_key,
            aws_session_token=creds.token,
            work_group=env_workgroup.get('WorkGroup', {}).get('Name', 'primary'),
            s3_staging_dir=f's3://{env.EnvironmentDefaultBucketName}/preview/{dataset.datasetUri}/{table.tableUri}',
            region_name=table.region,
        )
        cursor = connection.cursor()

        SQL = f'select * from "{table.GlueDatabaseName}"."{table.GlueTableName}" limit 50'  # nosec
        cursor.execute(SQL)
        fields = []
        for f in cursor.description:
            fields.append(json.dumps({'name': f[0]}))
        rows = []
        for row in cursor:
            rows.append(json.dumps(json_utils.to_json(list(row))))

    return {'rows': rows, 'fields': fields}


def get_glue_table_properties(context: Context, source: DatasetTable, **kwargs):
    if not source:
        return None
    with context.engine.scoped_session() as session:
        table: DatasetTable = DatasetTableService.get_dataset_table_by_uri(
            session, source.tableUri
        )
        return json_utils.to_string(table.GlueTableProperties).replace('\\', ' ')


def resolve_dataset(context, source: DatasetTable, **kwargs):
    if not source:
        return None
    with context.engine.scoped_session() as session:
        dataset_with_role = get_dataset(
            context, source=None, datasetUri=source.datasetUri
        )
        if not dataset_with_role:
            return None
    return dataset_with_role


def resolve_glossary_terms(context: Context, source: DatasetTable, **kwargs):
    if not source:
        return None
    with context.engine.scoped_session() as session:
        return Glossary.get_glossary_terms_links(
            session, source.tableUri, 'DatasetTable'
        )


def publish_table_update(context: Context, source, tableUri: str = None):
    with context.engine.scoped_session() as session:
        table: DatasetTable = DatasetTableService.get_dataset_table_by_uri(
            session, tableUri
        )
        ResourcePolicy.check_user_resource_permission(
            session=session,
            username=context.username,
            groups=context.groups,
            resource_uri=table.datasetUri,
            permission_name=UPDATE_DATASET_TABLE,
        )
        dataset = DatasetService.get_dataset_by_uri(session, table.datasetUri)
        env = db.api.Environment.get_environment_by_uri(session, dataset.environmentUri)
        if not env.subscriptionsEnabled or not env.subscriptionsProducersTopicName:
            raise Exception(
                'Subscriptions are disabled. '
                "First enable subscriptions for this dataset's environment then retry."
            )

        task = models.Task(
            targetUri=table.datasetUri,
            action='sns.dataset.publish_update',
            payload={'s3Prefix': table.S3Prefix},
        )
        session.add(task)

    Worker.process(engine=context.engine, task_ids=[task.taskUri], save_response=False)
    return True


def resolve_redshift_copy_schema(context, source: DatasetTable, clusterUri: str):
    if not source:
        return None
    with context.engine.scoped_session() as session:
        return db.api.RedshiftCluster.get_cluster_dataset_table(
            session, clusterUri, source.datasetUri, source.tableUri
        ).schema


def resolve_redshift_copy_location(
    context, source: DatasetTable, clusterUri: str
):
    with context.engine.scoped_session() as session:
        return db.api.RedshiftCluster.get_cluster_dataset_table(
            session, clusterUri, source.datasetUri, source.tableUri
        ).dataLocation


def list_shared_tables_by_env_dataset(context: Context, source, datasetUri: str, envUri: str, filter: dict = None):
    with context.engine.scoped_session() as session:
        return DatasetTableService.get_dataset_tables_shared_with_env(
            session,
            envUri,
            datasetUri
        )