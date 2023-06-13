import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import {
  BlockOutlined,
  CheckCircleOutlined,
  CopyAllOutlined,
  DeleteOutlined,
  RemoveCircleOutlineOutlined,
  RefreshRounded
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { CopyToClipboard } from 'react-copy-to-clipboard/lib/Component';
import { useTheme } from '@mui/styles';
import * as PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router';
import useSettings from '../../hooks/useSettings';
import ChevronRightIcon from '../../icons/ChevronRight';
import PlusIcon from '../../icons/Plus';
import useClient from '../../hooks/useClient';
import { SET_ERROR } from '../../store/errorReducer';
import { useDispatch } from '../../store';
import ShareStatus from '../../components/ShareStatus';
import TextAvatar from '../../components/TextAvatar';
import Pager from '../../components/Pager';
import Scrollbar from '../../components/Scrollbar';
import * as Defaults from '../../components/defaults';
import { PagedResponseDefault } from '../../components/defaults';
import AddShareItemModal from './AddShareItemModal';
import RevokeShareItemsModal from './RevokeShareItemsModal';
import getShareObject from '../../api/ShareObject/getShareObject';
import approveShareObject from '../../api/ShareObject/approveShareObject';
import rejectShareObject from '../../api/ShareObject/rejectShareObject';
import deleteShareObject from '../../api/ShareObject/deleteShareObject.js';
import submitApproval from '../../api/ShareObject/submitApproval';
import removeSharedItem from '../../api/ShareObject/removeSharedItem';
import ShareRejectModal from './ShareRejectModal';
import UpdateRejectReason from './ShareUpdateReject';
import UpdateRequestReason from './ShareUpdateRequest';


function ShareViewHeader(props) {
  const {
    share,
    client,
    dispatch,
    enqueueSnackbar,
    navigate,
    fetchItem,
    fetchItems,
    loading
  } = props;
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isRejectShareModalOpen, setIsRejectShareModalOpen] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const response = await client.mutate(
      submitApproval({
        shareUri: share.shareUri
      })
    );
    if (!response.errors) {
      enqueueSnackbar('Share request submitted', {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'top'
        },
        variant: 'success'
      });
      await fetchItem();
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setSubmitting(false);
  };
  const remove = async () => {
    setRemoving(true);
    const response = await client.mutate(
      deleteShareObject({
        shareUri: share.shareUri
      })
    );
    if (!response.errors) {
      enqueueSnackbar('Share request deleted', {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'top'
        },
        variant: 'success'
      });
      navigate('/console/shares');
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setRemoving(false);
  };

  const handleRejectShareModalOpen = () => {
    setIsRejectShareModalOpen(true);
  };

  const handleRejectShareModalClose = () => {
    setIsRejectShareModalOpen(false);
  };

  const accept = async () => {
    setAccepting(true);
    const response = await client.mutate(
      approveShareObject({
        shareUri: share.shareUri
      })
    );
    if (!response.errors) {
      enqueueSnackbar('Share request approved', {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'top'
        },
        variant: 'success'
      });
      await fetchItems();
      await fetchItem();
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setAccepting(false);
  };
  const reject = async (rejectPurpose) => {
    setRejecting(true);
    const response = await client.mutate(
      rejectShareObject({
        shareUri: share.shareUri,
        rejectPurpose: rejectPurpose
      })
    );
    if (!response.errors) {
      handleRejectShareModalClose()
      enqueueSnackbar('Share request rejected', {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'top'
        },
        variant: 'success'
      });
      await fetchItems();
      await fetchItem();
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setRejecting(false);
  };
  return (
    <>
    <Grid container justifyContent="space-between" spacing={3}>
      <Grid item>
        <Typography color="textPrimary" variant="h5">
          Share object for {share.dataset?.datasetName}
        </Typography>
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={<ChevronRightIcon fontSize="small" />}
          sx={{ mt: 1 }}
        >
          <Link
            underline="hover"
            color="textPrimary"
            component={RouterLink}
            to="/console/shares"
            variant="subtitle2"
          >
            Shares
          </Link>
          <Link
            underline="hover"
            color="textPrimary"
            component={RouterLink}
            to="/console/shares"
            variant="subtitle2"
          >
            Shares
          </Link>
          <Typography
            color="textSecondary"
            variant="subtitle2"
            component={RouterLink}
            to={`/console/datasets/${share.dataset?.datasetUri}`}
          >
            {share.dataset?.datasetName}
          </Typography>
        </Breadcrumbs>
      </Grid>
      <Grid item>
        {!loading && (
          <Box sx={{ m: -1 }}>
            <Button
              color="primary"
              startIcon={<RefreshRounded fontSize="small" />}
              sx={{ m: 1 }}
              variant="outlined"
              onClick={() => {
                fetchItem();
                fetchItems();
              }}
            >
              Refresh
            </Button>
            {share.userRoleForShareObject === 'Approvers' ? (
              <>
                {share.status === 'Submitted' && (
                  <>
                    <LoadingButton
                      loading={accepting}
                      color="success"
                      startIcon={<CheckCircleOutlined />}
                      sx={{ m: 1 }}
                      onClick={accept}
                      type="button"
                      variant="outlined"
                    >
                      Approve
                    </LoadingButton>
                    <LoadingButton
                      loading={rejecting}
                      color="error"
                      sx={{ m: 1 }}
                      startIcon={<BlockOutlined />}
                      onClick={handleRejectShareModalOpen}
                      type="button"
                      variant="outlined"
                    >
                      Reject
                    </LoadingButton>
                  </>
                )}
              </>
            ) : (
              <>
                {(share.status === 'Draft' || share.status === 'Rejected') && (
                  <LoadingButton
                    loading={submitting}
                    color="primary"
                    startIcon={<CheckCircleOutlined />}
                    sx={{ m: 1 }}
                    onClick={submit}
                    type="button"
                    variant="contained"
                  >
                    Submit
                  </LoadingButton>
                )}
              </>
            )}
            <Button
              color="primary"
              startIcon={<DeleteOutlined fontSize="small" />}
              sx={{ m: 1 }}
              variant="outlined"
              onClick={remove}
            >
              Delete
            </Button>
          </Box>
        )}
      </Grid>
    </Grid>
    {isRejectShareModalOpen && (
      <ShareRejectModal
        share={share}
        onApply={handleRejectShareModalClose}
        onClose={handleRejectShareModalClose}
        open={isRejectShareModalOpen}
        rejectFunction={reject}
      />
    )}
    </>
  );
}

ShareViewHeader.propTypes = {
  share: PropTypes.any,
  client: PropTypes.any,
  dispatch: PropTypes.any,
  enqueueSnackbar: PropTypes.any,
  navigate: PropTypes.any,
  fetchItem: PropTypes.func,
  fetchItems: PropTypes.func,
  loading: PropTypes.bool
};

function SharedItem(props) {
  const {
    item,
    client,
    dispatch,
    enqueueSnackbar,
    fetchShareItems,
    fetchItem
  } = props;
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  const removeItemFromShareObject = async () => {
    setIsRemovingItem(true);
    const response = await client.mutate(
      removeSharedItem({ shareItemUri: item.shareItemUri })
    );
    if (!response.errors) {
      enqueueSnackbar('Item removed', {
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'top'
        },
        variant: 'success'
      });
      await fetchShareItems();
      await fetchItem();
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setIsRemovingItem(false);
  };

  return (
    <TableRow hover>
      <TableCell>{item.itemType === 'Table' ? 'Table' : 'Folder'}</TableCell>
      <TableCell>{item.itemName}</TableCell>
      <TableCell>
        <ShareStatus status={item.status} />
      </TableCell>
      <TableCell>
        {(isRemovingItem) ? (
          <CircularProgress size={15} />
        ) : (
            <>
            {
              (item.status === 'Share_Succeeded' || item.status === 'Revoke_Failed') ? (
                <Typography
                  color="textSecondary"
                  variant="subtitle2"
                >
                  Revoke access to this item before deleting
                </Typography>
              ) : (item.status === 'Share_Approved' || item.status === 'Revoke_Approved' || item.status === 'Revoke_In_Progress' || item.status === 'Share_In_Progress') ? (
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                  >
                    Wait until this item is processed
                  </Typography>
                ) : (
                    <Button
                      color="primary"
                      startIcon={<DeleteOutlined fontSize="small" />}
                      sx={{ m: 1 }}
                      variant="outlined"
                      onClick={removeItemFromShareObject}
                    >
                      Delete
                    </Button>
              )
            }
            </>
        )}
      </TableCell>
    </TableRow>
  );
}

SharedItem.propTypes = {
  item: PropTypes.any,
  client: PropTypes.any,
  dispatch: PropTypes.any,
  enqueueSnackbar: PropTypes.any,
  fetchShareItems: PropTypes.func,
  fetchItem: PropTypes.func
};

const ShareView = () => {
  const { settings } = useSettings();
  const { enqueueSnackbar } = useSnackbar();
  const [share, setShare] = useState(null);
  const [filter, setFilter] = useState(Defaults.DefaultFilter);
  const [sharedItems, setSharedItems] = useState(PagedResponseDefault);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useParams();
  const client = useClient();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadingShareItems, setLoadingShareItems] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isRevokeItemsModalOpen, setIsRevokeItemsModalOpen] = useState(false);
  const handleAddItemModalOpen = () => {setIsAddItemModalOpen(true);};
  const handleAddItemModalClose = () => {setIsAddItemModalOpen(false);};
  const handleRevokeItemModalOpen = () => {setIsRevokeItemsModalOpen(true);};
  const handleRevokeItemModalClose = () => {setIsRevokeItemsModalOpen(false);};
  const handlePageChange = async (event, value) => {
    if (value <= sharedItems.pages && value !== sharedItems.page) {
      await setFilter({ ...filter, isShared: true, page: value });
    }
  };
  const copyNotification = () => {
    enqueueSnackbar('Copied to clipboard', {
      anchorOrigin: {
        horizontal: 'right',
        vertical: 'top'
      },
      variant: 'success'
    });
  };

  const fetchItem = useCallback(async () => {
    setLoading(true);
    const response = await client.query(
      getShareObject({ shareUri: params.uri })
    );
    if (!response.errors) {
      setShare(response.data.getShareObject);
    } else {
      dispatch({ type: SET_ERROR, error: response.errors[0].message });
    }
    setLoading(false);
  }, [client, dispatch, params.uri]);
  const fetchShareItems = useCallback(
    async (isAddingItem = false) => {
      setLoadingShareItems(true);
      const response = await client.query(
        getShareObject({
          shareUri: params.uri,
          filter: {
            ...filter,
            isShared: true
          }
        })
      );
      if (!response.errors) {
        if (isAddingItem) {
          await fetchItem();
        }
        setSharedItems({ ...response.data.getShareObject.items });
      } else {
        dispatch({ type: SET_ERROR, error: response.errors[0].message });
      }
      setLoadingShareItems(false);
    },
    [client, dispatch, filter, fetchItem, params.uri]
  );

  useEffect(() => {
    if (client) {
      fetchItem().catch((e) => dispatch({ type: SET_ERROR, error: e.message }));
      fetchShareItems().catch((e) =>
        dispatch({ type: SET_ERROR, error: e.message })
      );
    }
  }, [client, fetchShareItems, fetchItem, dispatch]);

  if (!share) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Shares: Share Details | data.all</title>
      </Helmet>
      <Box
        sx={{
          backgroundColor: 'background.default',
          minHeight: '100%',
          py: 8
        }}
      >
        <Container maxWidth={settings.compact ? 'xl' : false}>
          <ShareViewHeader
            share={share}
            client={client}
            dispatch={dispatch}
            navigate={navigate}
            enqueueSnackbar={enqueueSnackbar}
            fetchItem={fetchItem}
            fetchItems={fetchShareItems}
            loading={loadingShareItems}
          />
          {loading ? (
            <CircularProgress />
          ) : (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={3}>
                <Grid item md={5} xl={5} xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Card {...share} style={{ height: '95%' }}>
                      <Box>
                        <CardHeader title="Requested Dataset Details" />
                        <Divider />
                      </Box>
                      <CardContent>
                        <Box>
                          <Box>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Dataset
                            </Typography>
                            <Typography color="textPrimary" variant="subtitle2">
                              {share.dataset.datasetName}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 3 }}>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Dataset Owners
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                color="textPrimary"
                                variant="subtitle2"
                              >
                                {share.dataset.SamlAdminGroupName || '-'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 3 }}>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Dataset Environment
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                color="textPrimary"
                                variant="subtitle2"
                              >
                                {share.dataset.environmentName || '-'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 3 }}>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Your role for this request
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                color="textPrimary"
                                variant="subtitle2"
                              >
                                {share.userRoleForShareObject}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                </Grid>
                <Grid item md={7} xl={7} xs={12}>
                  <Card {...share} style={{ height: '95%' }}>
                    <CardHeader
                      avatar={<TextAvatar name={share.owner} />}
                      disableTypography
                      subheader={
                        <Link
                          underline="hover"
                          color="textPrimary"
                          component={RouterLink}
                          to="#"
                          variant="subtitle2"
                        >
                          {share.owner}
                        </Link>
                      }
                      style={{ paddingBottom: 0 }}
                      title={
                        <Typography
                          color="textPrimary"
                          display="block"
                          variant="overline"
                        >
                          Request created by
                        </Typography>
                      }
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <List>
                        <ListItem
                          disableGutters
                          divider
                          sx={{
                            justifyContent: 'space-between',
                            padding: 2
                          }}
                        >
                          <Typography color="textSecondary" variant="subtitle2">
                            Principal
                          </Typography>
                          <Typography
                            color="textPrimary"
                            variant="body2"
                            sx={{
                              width: '500px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2
                            }}
                          >
                            <Tooltip
                              title={share.principal.principalName || '-'}
                            >
                              <span>
                                {share.principal.principalName || '-'}
                              </span>
                            </Tooltip>
                          </Typography>
                        </ListItem>
                        <ListItem
                          disableGutters
                          divider
                          sx={{
                            justifyContent: 'space-between',
                            padding: 2
                          }}
                        >
                          <Typography color="textSecondary" variant="subtitle2">
                            Requester Team
                          </Typography>
                          <Typography color="textPrimary" variant="body2">
                            {share.principal.SamlGroupName || '-'}
                          </Typography>
                        </ListItem>
                        <ListItem
                          disableGutters
                          divider
                          sx={{
                            justifyContent: 'space-between',
                            padding: 2
                          }}
                        >
                          <Typography color="textSecondary" variant="subtitle2">
                            Requester Environment
                          </Typography>
                          <Typography color="textPrimary" variant="body2">
                            {share.principal.environmentName || '-'}
                          </Typography>
                        </ListItem>
                        <ListItem
                          disableGutters
                          divider
                          sx={{
                            justifyContent: 'space-between',
                            padding: 2
                          }}
                        >
                          <Typography color="textSecondary" variant="subtitle2">
                            Creation time
                          </Typography>
                          <Typography color="textPrimary" variant="body2">
                            {share.created}
                          </Typography>
                        </ListItem>
                        <ListItem
                          disableGutters
                          sx={{
                            justifyContent: 'space-between',
                            padding: 2
                          }}
                        >
                          <Typography color="textSecondary" variant="subtitle2">
                            Status
                          </Typography>
                          <Typography color="textPrimary" variant="body2">
                            <ShareStatus status={share.status} />
                          </Typography>
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Box sx={{ mb: 3 }}>
                <Card {...share}>
                  <CardContent>
                        <Box>
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Request Purpose
                              {share.userRoleForShareObject === 'Requesters' && (
                                  <UpdateRequestReason
                                    share={share}
                                    client={client}
                                    dispatch={dispatch}
                                    enqueueSnackbar={enqueueSnackbar}
                                    fetchItem={fetchItem}
                                  />
                              )}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                color="textPrimary"
                                variant="subtitle2"
                              >
                                {share.requestPurpose || '-'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              color="textSecondary"
                              variant="subtitle2"
                            >
                              Reject Purpose
                              {share.userRoleForShareObject === 'Approvers' && (
                                  <UpdateRejectReason
                                    share={share}
                                    client={client}
                                    dispatch={dispatch}
                                    enqueueSnackbar={enqueueSnackbar}
                                    fetchItem={fetchItem}
                                  />
                              )}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                color="textPrimary"
                                variant="subtitle2"
                              >
                                {share.rejectPurpose || '-'}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                </Card>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Card {...share}>
                  <Box>
                    <CardHeader title="Data Consumption details" />
                    <Divider />
                  </Box>
                  <CardContent>
                    <Box>
                      <Box>
                        <Typography display="inline" color="textSecondary" variant="subtitle2">
                          S3 Access Point name (Folder sharing):
                        </Typography>
                        <Typography display="inline" color="textPrimary" variant="subtitle2">
                          {` ${share.consumptionData.s3AccessPointName || '-'}`}
                        </Typography>
                        <Typography color="textPrimary" variant="subtitle2">
                          <CopyToClipboard
                            onCopy={() => copyNotification()}
                            text={`aws s3 ls arn:aws:s3:${share.dataset.region}:${share.dataset.AwsAccountId}:accesspoint/${share.consumptionData.s3AccessPointName}/SHARED_FOLDER/`}
                          >
                            <IconButton>
                              <CopyAllOutlined
                                sx={{
                                  color:
                                    theme.palette.mode === 'dark'
                                      ? theme.palette.primary.contrastText
                                      : theme.palette.primary.main
                                }}
                              />
                            </IconButton>
                          </CopyToClipboard>
                          {`aws s3 ls arn:aws:s3:${share.dataset.region}:${share.dataset.AwsAccountId}:accesspoint/${share.consumptionData.s3AccessPointName}/SHARED_FOLDER/`}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 3 }}>
                        <Typography display="inline" color="textSecondary" variant="subtitle2">
                          Glue database name (Table sharing):
                        </Typography>
                        <Typography display="inline" color="textPrimary" variant="subtitle2">
                          {` ${share.consumptionData.sharedGlueDatabase || '-'}`}
                        </Typography>
                        <Typography color="textPrimary" variant="subtitle2">
                          <CopyToClipboard
                            onCopy={() => copyNotification()}
                            text={`SELECT * FROM ${share.consumptionData.sharedGlueDatabase}.TABLENAME`}
                          >
                            <IconButton>
                              <CopyAllOutlined
                                sx={{
                                  color:
                                    theme.palette.mode === 'dark'
                                      ? theme.palette.primary.contrastText
                                      : theme.palette.primary.main
                                }}
                              />
                            </IconButton>
                          </CopyToClipboard>
                          {`SELECT * FROM ${share.consumptionData.sharedGlueDatabase}.TABLENAME`}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Card>
                <CardHeader
                  title="Shared Items"
                  action={
                    <Box>
                      <LoadingButton
                        color="primary"
                        onClick={handleAddItemModalOpen}
                        startIcon={<PlusIcon fontSize="small" />}
                        sx={{ m: 1 }}
                        variant="outlined"
                      >
                        Add Item
                      </LoadingButton>
                      <LoadingButton
                        color="error"
                        startIcon={<RemoveCircleOutlineOutlined />}
                        sx={{ m: 1 }}
                        onClick={handleRevokeItemModalOpen}
                        type="button"
                        variant="outlined"
                        >
                        Revoke Items
                      </LoadingButton>
                    </Box>
                  }
                />
                <Divider />
                <Scrollbar>
                  <Box sx={{ minWidth: 600 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      {loadingShareItems ? (
                        <CircularProgress sx={{ mt: 1 }} size={20} />
                      ) : (
                        <TableBody>
                          {sharedItems.nodes.length > 0 ? (
                            sharedItems.nodes.map((sharedItem) => (
                              <SharedItem
                                key={sharedItem.itemUri}
                                item={sharedItem}
                                client={client}
                                dispatch={dispatch}
                                enqueueSnackbar={enqueueSnackbar}
                                fetchShareItems={fetchShareItems}
                                fetchItem={fetchItem}
                              />
                            ))
                          ) : (
                            <TableRow>
                              <TableCell>No items added.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      )}
                    </Table>
                    {sharedItems.nodes.length > 0 && (
                      <Pager
                        mgTop={2}
                        mgBottom={2}
                        items={sharedItems}
                        onChange={handlePageChange}
                      />
                    )}
                  </Box>
                </Scrollbar>
              </Card>
            </Box>
          )}
        </Container>
        {isAddItemModalOpen && (
          <AddShareItemModal
            share={share}
            onApply={handleAddItemModalClose}
            onClose={handleAddItemModalClose}
            reloadSharedItems={fetchShareItems}
            open={isAddItemModalOpen}
          />
        )}
        {isRevokeItemsModalOpen && (
          <RevokeShareItemsModal
            share={share}
            onApply={handleRevokeItemModalClose}
            onClose={handleRevokeItemModalClose}
            reloadSharedItems={fetchShareItems}
            open={isRevokeItemsModalOpen}
          />
        )}
      </Box>
    </>
  );
};

export default ShareView;
