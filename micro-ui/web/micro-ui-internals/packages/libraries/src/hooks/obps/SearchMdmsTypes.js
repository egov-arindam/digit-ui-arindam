import { useQuery } from "react-query";
import { MdmsService } from "../../services/elements/MDMS";

const SearchMdmsTypes = {
  useApplicationTypes: (tenantId) =>
    useQuery(
      [tenantId, "BPA_MDMS_APPLICATION_STATUS"],
      () =>
        MdmsService.getDataByCriteria(
          tenantId,
          {
            details: {
              tenantId: tenantId,
              moduleDetails: [
                {
                  moduleName: "BPA",
                  masterDetails: [
                    {
                      name: "ApplicationType",
                    },
                  ],
                },
              ],
            },
          },
          "BPA"
        ),
      {
        select: (data) =>{
          return [...data?.BPA?.ApplicationType?.map((type) => ({
              code: type.code,
              i18nKey: `WF_BPA_${type.code}`,
            }))]
        },
      }
    ),

    useServiceTypes: (tenantId) =>
    useQuery(
      [tenantId, "BPA_MDMS_SERVICE_STATUS"],
      () =>
        MdmsService.getDataByCriteria(
          tenantId,
          {
            details: {
              tenantId: tenantId,
              moduleDetails: [
                {
                  moduleName: "BPA",
                  masterDetails: [
                    {
                      name: "ServiceType",
                    },
                  ],
                },
              ],
            },
          },
          "BPA"
        ),
      {
        select: (data) =>{
          return [...data?.BPA?.ServiceType?.map((type) => ({
            code: type.code,
            i18nKey: `BPA_SERVICETYPE_${type.code}`,
            applicationType: type.applicationType,
          }))]
        },
      }
    ),

    useBPAServiceTypes: (tenantId) =>
     useQuery(
      [tenantId, "BPA_MDMS_SERVICE_STATUS"],
      () =>
        MdmsService.getDataByCriteria(
          tenantId,
          {
            details: {
              tenantId: tenantId,
              moduleDetails: [
                {
                  moduleName: "BPA",
                  masterDetails: [
                    {
                      name: "BPAAppicationMapping",
                    },
                  ],
                },
              ],
            },
          },
          "BPA"
        ),
      {
        select: (data) =>{
        return [...data?.BPA?.BPAAppicationMapping?.filter(function (currentObject){
        let flag = 0;
        currentObject?.roles?.map((bpaRole) => {
          const found = Digit.UserService.getUser()?.info?.roles.some(role => role?.code === bpaRole )
          if(found == true)
          flag = 1;
        })
        if(flag == 1) return true;
        else return false;
      }).map((type) => ({
        code: type.code,
        i18nKey: `BPA_SERVICETYPE_${type.code}`,
        applicationType: type.applicationType,
      }))]
        },
      }
    ), 

  getFormConfig: (tenantId, config) =>
    useQuery(
      [tenantId, "FORM_CONFIG"],
      () =>
        MdmsService.getDataByCriteria(
          tenantId,
          {
            details: {
              tenantId: tenantId,
              moduleDetails: [
                {
                  moduleName: "BPA",
                  masterDetails: [
                    {
                      "name": "BuildingPermitConfig"
                    },
                    {
                      "name": "EdcrConfig"
                    },
                    {
                      "name": "InspectionReportConfig"
                    },
                    {
                      "name": "OCBuildingPermitConfig"
                    },
                    {
                      "name": "OCEdcrConfig"
                    },
                    {
                      "name": "StakeholderConfig"
                    }
                  ],
                },
              ],
            },
          },
          "BPA"
        ),
      { select: (d) => d.BPA, ...config }
    ),
};

export default SearchMdmsTypes;