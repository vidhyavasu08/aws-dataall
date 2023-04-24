import logging

from ....db import models, api


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
