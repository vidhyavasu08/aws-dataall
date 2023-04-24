import logging

from ....db import models, api
from .... api.Objects.Stack import stack_helper


log = logging.getLogger(__name__)


class ProcessS3BucketShare:
    def __init__(
        self,
        session,
        dataset: models.Dataset,
        share: models.ShareObject,
        source_environment: models.Environment,
        target_environment: models.Environment,
        source_env_group: models.EnvironmentGroup,
        env_group: models.EnvironmentGroup,
    ):

        super().__init__(
            session,
            dataset,
            share,
            source_environment,
            target_environment,
            source_env_group,
            env_group,
        )

    @classmethod
    def process_approved_shares(
        cls,
        session,
        dataset: models.Dataset,
        share: models.ShareObject,
        source_environment: models.Environment,
        target_environment: models.Environment,
        source_env_group: models.EnvironmentGroup,
        env_group: models.EnvironmentGroup
    ) -> bool:
        """
        1) update_share_item_status with Start action
        2) ......
        #TODO: define list of actions needed: give IAM permissions, update Bucket policy...
        6) update_share_item_status with Finish action

        Returns
        -------
        True if share is granted successfully
        """
        log.info(
            '##### Starting Sharing bucket #######'
        )
        success = True
        sharing_item = api.ShareObject.find_share_item_bucket(
            session,
            share,
        )
        shared_item_SM = api.ShareItemSM(models.ShareItemStatus.Share_Approved.value)
        new_state = shared_item_SM.run_transition(models.Enums.ShareObjectActions.Start.value)
        shared_item_SM.update_state_single_item(session, sharing_item, new_state)
        try:
            #TODO: implement sharing code
            # 1. implement Give IAM permissions - reuse code from backend/dataall/tasks/data_sharing/share_managers/s3_share_manager.py
            # 2. Trigger update Dataset: in the initial implementation it used stack_helper.deploy_stack(context, share.datasetUri)
            # directly from approve_share resolver (graphql api call) but since we are triggering the whole sharing with a processor it is better
            # to use something like what is implemented in the stacks updater (backend/dataall/tasks/stacks_updater.py)
            # I pasted the code below:

            # def update_stack(session, envname, target_uri, wait=False):
            #     stack: models.Stack = db.api.Stack.get_stack_by_target_uri(
            #         session, target_uri=target_uri
            #     )
            #     cluster_name = Parameter().get_parameter(env=envname, path='ecs/cluster/name')
            #     if not Ecs.is_task_running(cluster_name=cluster_name, started_by=f'awsworker-{stack.stackUri}'):
            #         stack.EcsTaskArn = Ecs.run_cdkproxy_task(stack_uri=stack.stackUri)
            #         if wait:
            #             retries = 1
            #             while Ecs.is_task_running(cluster_name=cluster_name, started_by=f'awsworker-{stack.stackUri}'):
            #                 log.info(
            #                     f"Update for {stack.name}//{stack.stackUri} is not complete, waiting for {SLEEP_TIME} seconds...")
            #                 time.sleep(SLEEP_TIME)
            #                 retries = retries + 1
            #                 if retries > RETRIES:
            #                     log.info(f"Maximum number of retries exceeded ({RETRIES} retries), continuing task...")
            #                     break
            #             log.info(
            #                 f"Update for {stack.name}//{stack.stackUri} COMPLETE or maximum number of retries exceeded ({RETRIES} retries)")
            #     else:
            #         log.info(
            #             f'Stack update is already running... Skipping stack {stack.name}//{stack.stackUri}'
            #         )

            new_state = shared_item_SM.run_transition(models.Enums.ShareItemActions.Success.value)
            shared_item_SM.update_state_single_item(session, sharing_item, new_state)

        except Exception as e:
            #TODO implement handle failure code
            #sharing_bucket.handle_share_failure(e)
            new_state = shared_item_SM.run_transition(models.Enums.ShareItemActions.Failure.value)
            shared_item_SM.update_state_single_item(session, sharing_item, new_state)
            success = False

        return success

    @classmethod
    def process_revoked_shares(
            cls,
            session,
            dataset: models.Dataset,
            share: models.ShareObject,
            source_environment: models.Environment,
            target_environment: models.Environment,
            source_env_group: models.EnvironmentGroup,
            env_group: models.EnvironmentGroup
    ) -> bool:
        """
        1) update_share_item_status with Start action
        #TODO: define list of actions needed: give IAM permissions, update Bucket policy...
        3) update_share_item_status with Finish action

        Returns
        -------
        True if share is revoked successfully
        """

        log.info(
            '##### Starting Revoking bucket share #######'
        )
        removing_item = api.ShareObject.find_share_item_bucket(
            session,
            share,
        )
        revoked_item_SM = api.ShareItemSM(models.ShareItemStatus.Revoke_Approved.value)
        new_state = revoked_item_SM.run_transition(models.Enums.ShareObjectActions.Start.value)
        revoked_item_SM.update_state_single_item(session, removing_item, new_state)
        success = True
        try:
            # TODO: implement revoking code
            new_state = revoked_item_SM.run_transition(models.Enums.ShareItemActions.Success.value)
            revoked_item_SM.update_state_single_item(session, removing_item, new_state)

        except Exception as e:
            # TODO implement handle failure code
            #removing_folder.handle_revoke_failure(e)
            new_state = revoked_item_SM.run_transition(models.Enums.ShareItemActions.Failure.value)
            revoked_item_SM.update_state_single_item(session, removing_item, new_state)
            success = False

        return success

    @staticmethod
    def clean_up_share(
            dataset: models.Dataset,
            share: models.ShareObject,
            target_environment: models.Environment
    ):
        """
        #TODO: define list of actions needed: give IAM permissions, update Bucket policy... if needed

        Returns
        -------
        True if share is cleaned-up successfully
        """

        clean_up = "someaction"

        return True
