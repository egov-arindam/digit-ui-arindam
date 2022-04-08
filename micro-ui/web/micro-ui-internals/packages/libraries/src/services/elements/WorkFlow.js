import Urls from "../atoms/urls";
import { Request } from "../atoms/Utils/Request";
import cloneDeep from "lodash/cloneDeep";

const getThumbnails = async (ids, tenantId) => {
  tenantId = window.location.href.includes("/obps/") ? Digit.ULBService.getStateId() : tenantId;
  const res = await Digit.UploadServices.Filefetch(ids, tenantId);
  if (res.data.fileStoreIds && res.data.fileStoreIds.length !== 0) {
    return { thumbs: res.data.fileStoreIds.map((o) => o.url.split(",")[3] || o.url.split(",")[0]), images: res.data.fileStoreIds.map((o) => Digit.Utils.getFileUrl(o.url)) };
  } else {
    return null;
  }
};

const makeCommentsSubsidariesOfPreviousActions = async (wf) => {
  // const {info: { type: userType } = {}} = Digit.UserService.getUser()
  const TimelineMap = new Map();
  // if(userType === "CITIZEN"){
  //   for (const eventHappened of wf ){
  //     if(eventHappened.action === "APPLY" && eventHappened?.documents){
  //       eventHappened.thumbnailsToShow = await getThumbnails(eventHappened?.documents?.map(e => e?.fileStoreId), eventHappened?.tenantId)
  //     }
  //     if( eventHappened.action === "COMMENT" ){
  //       const commentAccumulator = TimelineMap.get("tlCommentStack") || []
  //       TimelineMap.set("tlCommentStack", [...commentAccumulator, eventHappened])
  //     }
  //     else{
  //       const eventAccumulator = TimelineMap.get("tlActions") || []
  //       const commentAccumulator = TimelineMap.get("tlCommentStack") || []
  //       eventHappened.wfComments = [...commentAccumulator]
  //       TimelineMap.set("tlActions", [...eventAccumulator, eventHappened])
  //       TimelineMap.delete("tlCommentStack")
  //     }
  //   }
  // } else{
  for (const eventHappened of wf) {
    if (eventHappened?.documents) {
      eventHappened.thumbnailsToShow = await getThumbnails(eventHappened?.documents?.map(e => e?.fileStoreId), eventHappened?.tenantId)
    }
    if (eventHappened.action === "COMMENT") {
      const commentAccumulator = TimelineMap.get("tlCommentStack") || []
      TimelineMap.set("tlCommentStack", [...commentAccumulator, eventHappened])
    }
    else {
      const eventAccumulator = TimelineMap.get("tlActions") || []
      const commentAccumulator = TimelineMap.get("tlCommentStack") || []
      eventHappened.wfComments = [...commentAccumulator, ...eventHappened.comment ? [eventHappened] : []]
      TimelineMap.set("tlActions", [...eventAccumulator, eventHappened])
      TimelineMap.delete("tlCommentStack")
    }
  }
  // }
  const response = TimelineMap.get("tlActions")
  return response
}

export const WorkflowService = {
  init: (stateCode, businessServices) => {
    return Request({
      url: Urls.WorkFlow,
      useCache: true,
      method: "POST",
      params: { tenantId: stateCode, businessServices },
      auth: true,
    });
  },

  getByBusinessId: (stateCode, businessIds, params = {}, history = true) => {
    return Request({
      url: Urls.WorkFlowProcessSearch,
      useCache: false,
      method: "POST",
      params: { tenantId: stateCode, businessIds: businessIds, ...params, history },
      auth: true,
    });
  },

  getDetailsById: async ({ tenantId, id, moduleCode, role, getTripData }) => {
    const workflow = await Digit.WorkflowService.getByBusinessId(tenantId, id);
    const applicationProcessInstance = cloneDeep(workflow?.ProcessInstances);
    const getLocationDetails = window.location.href.includes("/obps/") || window.location.href.includes("noc/inbox");
    const moduleCodeData = getLocationDetails ? applicationProcessInstance?.[0]?.businessService : moduleCode;
    const businessServiceResponse = (await Digit.WorkflowService.init(tenantId, moduleCodeData))?.BusinessServices[0]?.states;
    if (workflow && workflow.ProcessInstances) {
      const processInstances = workflow.ProcessInstances;
      const nextStates = processInstances[0]?.nextActions.map((action) => ({ action: action?.action, nextState: processInstances[0]?.state.uuid }));
      const nextActions = nextStates.map((id) => ({
        action: id.action,
        state: businessServiceResponse?.find((state) => state.uuid === id.nextState),
      }));

      /* To check state is updatable and provide edit option*/
      const currentState = businessServiceResponse?.find((state) => state.uuid === processInstances[0]?.state.uuid);
      if (currentState && currentState?.isStateUpdatable) {
        if (moduleCode === "FSM" || moduleCode === "FSM_POST_PAY_SERVICE" || moduleCode === "FSM_VEHICLE_TRIP" || moduleCode === "PGR" || moduleCode === "OBPS") null;
        else nextActions.push({ action: "EDIT", state: currentState });
      }

      const getStateForUUID = (uuid) => businessServiceResponse?.find((state) => state.uuid === uuid);

      const actionState = businessServiceResponse
        ?.filter((state) => state.uuid === processInstances[0]?.state.uuid)
        .map((state) => {
          let _nextActions = state.actions?.map?.((ac) => {
            let actionResultantState = getStateForUUID(ac.nextState);
            let assignees = actionResultantState?.actions?.reduce?.((acc, act) => {
              return [...acc, ...act.roles];
            }, []);
            return { ...actionResultantState, assigneeRoles: assignees, action: ac.action, roles: ac.roles };
          });
          return { ...state, nextActions: _nextActions, roles: state?.action, roles: state?.actions?.reduce((acc, el) => [...acc, ...el.roles], []) };
        })?.[0];

      const actionRolePair = nextActions?.map((action) => ({
        action: action?.action,
        roles: action.state?.actions?.map((action) => action.roles).join(","),
      }));

      if (processInstances.length > 0) {
        const TLEnrichedWithWorflowData = await makeCommentsSubsidariesOfPreviousActions(processInstances)
        const timeline = TLEnrichedWithWorflowData.map((instance, ind) => {
          let checkPoint = {
            performedAction: instance.action,
            status: instance.state.applicationStatus,
            state: instance.state.state,
            assigner: instance?.assigner,
            rating: instance?.rating,
            wfComment: instance?.wfComments.map(e => e?.comment),
            wfDocuments: instance?.documents,
            thumbnailsToShow: { thumbs: instance?.thumbnailsToShow?.thumbs, fullImage: instance?.thumbnailsToShow?.images },
            assignes: instance.assignes,
            caption: instance.assignes ? instance.assignes.map((assignee) => ({ name: assignee.name, mobileNumber: assignee.mobileNumber })) : null,
            auditDetails: {
              created: Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.createdTime),
              lastModified: Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.lastModifiedTime),
            },
            timeLineActions: instance.nextActions
              ? instance.nextActions.filter((action) => action.roles.includes(role)).map((action) => action?.action)
              : null,
          };
          return checkPoint;
        });

        if (getTripData) {
          try {
            const filters = {
              businessService: 'FSM_VEHICLE_TRIP',
              refernceNos: id
            };
            const tripSearchResp = await Digit.FSMService.vehicleSearch(tenantId, filters)
            if (tripSearchResp && tripSearchResp.vehicleTrip && tripSearchResp.vehicleTrip.length) {
              const numberOfTrips = tripSearchResp.vehicleTrip.length
              let cretaedTime = 0
              let lastModifiedTime = 0
              let waitingForDisposedAction = []
              let disposedAction = []
              for (const data of tripSearchResp.vehicleTrip) {
                const resp = await Digit.WorkflowService.getByBusinessId(tenantId, data.applicationNo)
                resp?.ProcessInstances?.map((instance, ind) => {
                  if (instance.state.applicationStatus === "WAITING_FOR_DISPOSAL") {
                    cretaedTime = Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.createdTime)
                    lastModifiedTime = Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.lastModifiedTime)
                    waitingForDisposedAction = [{
                      performedAction: instance.action,
                      status: instance.state.applicationStatus,
                      state: instance.state.state,
                      assigner: instance?.assigner,
                      rating: instance?.rating,
                      thumbnailsToShow: { thumbs: instance?.thumbnailsToShow?.thumbs, fullImage: instance?.thumbnailsToShow?.images },
                      assignes: instance.assignes,
                      caption: instance.assignes ? instance.assignes.map((assignee) => ({ name: assignee.name, mobileNumber: assignee.mobileNumber })) : null,
                      auditDetails: {
                        created: cretaedTime,
                        lastModified: lastModifiedTime,
                      },
                      numberOfTrips: numberOfTrips
                    }]
                  }
                  if (instance.state.applicationStatus === "DISPOSED") {
                    cretaedTime = instance.auditDetails.createdTime > cretaedTime ? Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.createdTime) : cretaedTime
                    lastModifiedTime = instance.auditDetails.lastModifiedTime > lastModifiedTime ? Digit.DateUtils.ConvertEpochToDate(instance.auditDetails.lastModifiedTime) : lastModifiedTime
                    disposedAction = [{
                      performedAction: instance.action,
                      status: instance.state.applicationStatus,
                      state: instance.state.state,
                      assigner: instance?.assigner,
                      rating: instance?.rating,
                      thumbnailsToShow: { thumbs: instance?.thumbnailsToShow?.thumbs, fullImage: instance?.thumbnailsToShow?.images },
                      assignes: instance.assignes,
                      caption: instance.assignes ? instance.assignes.map((assignee) => ({ name: assignee.name, mobileNumber: assignee.mobileNumber })) : null,
                      auditDetails: {
                        created: cretaedTime,
                        lastModified: lastModifiedTime,
                      },
                      numberOfTrips: numberOfTrips
                    }]
                  }
                })
              }
              let tripTimeline = disposedAction.concat(waitingForDisposedAction)
              const feedbackPosition = timeline.findIndex((data) => data.status === "CITIZEN_FEEDBACK_PENDING")
              if (feedbackPosition !== -1) {
                timeline.splice(feedbackPosition + 1, 0, ...tripTimeline)
              } else {
                timeline = tripTimeline.concat(timeline)
              }
            }
          } catch (err) { }
        }

        const nextActions = actionRolePair;

        if (role !== "CITIZEN" && moduleCode === "PGR") {
          const onlyPendingForAssignmentStatusArray = timeline?.filter(e => e?.status === "PENDINGFORASSIGNMENT")
          const duplicateCheckpointOfPendingForAssignment = onlyPendingForAssignmentStatusArray.at(-1)
          // const duplicateCheckpointOfPendingForAssignment = timeline?.find( e => e?.status === "PENDINGFORASSIGNMENT")
          timeline.push({
            ...duplicateCheckpointOfPendingForAssignment,
            status: "COMPLAINT_FILED",
          });
        }

        if (timeline[timeline.length - 1].status !== "CREATED" && (moduleCode === "FSM" || moduleCode === "FSM_POST_PAY_SERVICE"))
          timeline.push({
            status: "CREATED",
          });

        const details = {
          timeline,
          nextActions,
          actionState,
          applicationBusinessService: workflow?.ProcessInstances?.[0]?.businessService,
          processInstances: applicationProcessInstance,
        };
        return details;
      }
    } else {
      throw new Error("error fetching workflow services");
    }
    return {};
  },

  getAllApplication: (tenantId, filters) => {
    return Request({
      url: Urls.WorkFlowProcessSearch,
      useCache: false,
      method: "POST",
      params: { tenantId, ...filters },
      auth: true,
    });
  },
};
