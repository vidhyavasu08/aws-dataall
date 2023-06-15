"""_share_request_purpose

Revision ID: 72b8a90b6ee8
Revises: 509997f0a51e
Create Date: 2023-06-05 12:28:56.221364

"""
from alembic import op
from sqlalchemy import orm, Column, String, and_
from sqlalchemy.ext.declarative import declarative_base

from dataall.db import api, models, permissions

# revision identifiers, used by Alembic.
revision = '72b8a90b6ee8'
down_revision = '509997f0a51e'
branch_labels = None
depends_on = None

Base = declarative_base()


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('share_object', Column('requestPurpose', String(), nullable=True))
    op.add_column('share_object', Column('rejectPurpose', String(), nullable=True))

    # ### Remove SUBMIT_SHARE_OBJECT Permissions from Approvers
    try:
        bind = op.get_bind()
        session = orm.Session(bind=bind)
        # print('Getting SUBMIT_SHARE_OBJECT Permission...')
        # permission: models.Permission = api.Permission.find_permission_by_name(
        #     session, "SUBMIT_SHARE_OBJECT", "RESOURCE"
        # )
        print('Getting all Share Objects...')
        shares: [modelsShareObject] = session.query(models.ShareObject).all()
        for share in shares:
            dataset = api.Dataset.get_dataset_by_uri(session, share.datasetUri)

            # Dataset Admins
            # Delete and Recreate Dataset Share Object Permissions to be Share Object Approver Permission Set
            api.ResourcePolicy.delete_resource_policy(
                session=session,
                group=dataset.SamlAdminGroupName,
                resource_uri=share.shareUri,
            )
            api.ResourcePolicy.attach_resource_policy(
                session=session,
                group=dataset.SamlAdminGroupName,
                permissions=permissions.SHARE_OBJECT_APPROVER,
                resource_uri=share.shareUri,
                resource_type=models.ShareObject.__name__,
            )
            print(f"Recreated SHARE_OBJECT_APPROVER Permissions for Dataset Owner {dataset.SamlAdminGroupName} on Share {share.shareUri}")

            # Dataset Stewards
            # Remove SUBMIT_SHARE_OBJECT Permissions From Dataset Stewards If Exist
            if dataset.SamlAdminGroupName != dataset.stewards:
                api.ResourcePolicy.delete_resource_policy(
                    session=session,
                    group=dataset.stewards,
                    resource_uri=share.shareUri,
                )
                api.ResourcePolicy.attach_resource_policy(
                    session=session,
                    group=dataset.stewards,
                    permissions=permissions.SHARE_OBJECT_APPROVER,
                    resource_uri=share.shareUri,
                    resource_type=models.ShareObject.__name__,
                )
                print(f"Recreated SHARE_OBJECT_APPROVER Permissions for Dataset Steward {dataset.stewards} on Share {share.shareUri}")
            
    except Exception as e:
        print(e)
        print(f'Failed to update share object approver permissions due to: {e}')
        raise e
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('share_object', 'requestPurpose')
    op.drop_column('share_object', 'rejectPurpose')
    # ### end Alembic commands ###
