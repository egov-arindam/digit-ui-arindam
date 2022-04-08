import React, { useEffect, useState } from "react";
import {
  Header,
  Card,
  RadioButtons,
  SubmitBar,
  BackButton,
  CardLabel,
  CardLabelDesc,
  CardSectionHeader,
  InfoBanner,
  Loader,
  Toast
} from "@egovernments/digit-ui-react-components";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { useParams, useHistory, useLocation, Redirect } from "react-router-dom";
import { stringReplaceAll } from "../bills/routes/bill-details/utils";

export const SelectPaymentType = (props) => {
  const { state = {} } = useLocation();
  const userInfo = Digit.UserService.getUser();
  const [showToast, setShowToast] = useState(null);
  const { tenantId: __tenantId, authorization, workflow : wrkflow } = Digit.Hooks.useQueryParams();
  const paymentAmount = state?.paymentAmount;
  const { t } = useTranslation();
  const history = useHistory();

  const { pathname, search } = useLocation();
  // const menu = ["AXIS"];
  const { consumerCode, businessService } = useParams();
  const tenantId = state?.tenantId || __tenantId || Digit.ULBService.getCurrentTenantId();
  const stateTenant = Digit.ULBService.getStateId();
  const { control, handleSubmit } = useForm();
  const { data: menu, isLoading } = Digit.Hooks.useCommonMDMS(stateTenant, "DIGIT-UI", "PaymentGateway");
  const { data: paymentdetails, isLoading: paymentLoading } = Digit.Hooks.useFetchPayment({ tenantId: tenantId, consumerCode : wrkflow === "WNS"? stringReplaceAll(consumerCode,"+","/") : consumerCode, businessService }, {});
  useEffect(()=>{
    if(paymentdetails?.Bill&&paymentdetails.Bill.length==0){
      setShowToast({ key: true, label: "CS_BILL_NOT_FOUND" });
    }
  },[paymentdetails])
  const { name, mobileNumber } = state;
 
  const billDetails = paymentdetails?.Bill ? paymentdetails?.Bill[0] : {};

  const onSubmit = async (d) => {
    const filterData = {
      Transaction: {
        tenantId: tenantId,
        txnAmount: paymentAmount || billDetails.totalAmount,
        module: businessService,
        billId: billDetails.id,
        consumerCode: wrkflow === "WNS"? stringReplaceAll(consumerCode,"+","/") : consumerCode,
        productInfo: "Common Payment",
        gateway: d.paymentType,
        taxAndPayments: [
          {
            billId: billDetails.id,
            amountPaid: paymentAmount || billDetails.totalAmount,
          },
        ],
        user: {
          name: name || userInfo?.info?.name,
          mobileNumber:  mobileNumber || userInfo?.info?.mobileNumber,
          tenantId: tenantId,
        },
        // success
        callbackUrl: window.location.href.includes("mcollect")
          ? `${window.location.protocol}//${window.location.host}/digit-ui/citizen/payment/success/${businessService}/${consumerCode}/${tenantId}?workflow=mcollect`
          : `${window.location.protocol}//${window.location.host}/digit-ui/citizen/payment/success/${businessService}/${consumerCode}/${tenantId}`,
        additionalDetails: {
          isWhatsapp: false,
        },
      },
    };

    try {
      const data = await Digit.PaymentService.createCitizenReciept(tenantId, filterData);
      const redirectUrl = data?.Transaction?.redirectUrl;
      window.location = redirectUrl;
    } catch (error) {
      let messageToShow = "CS_PAYMENT_UNKNOWN_ERROR_ON_SERVER";
      if (error.response?.data?.Errors?.[0]) {
        const { code, message } = error.response?.data?.Errors?.[0];
        messageToShow = t(message);
      }
      window.alert(messageToShow);

      // TODO: add error toast for error.response.data.Errors[0].message
    }
  };

  if (authorization === "true" && !userInfo.access_token) {
    return <Redirect to={`/digit-ui/citizen/login?from=${encodeURIComponent(pathname + search)}`} />;
  }

  if (isLoading || paymentLoading) {
    return <Loader />;
  }

  return (
    <React.Fragment>
      <BackButton>{t("CS_COMMON_BACK")}</BackButton>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Header>{t("PAYMENT_CS_HEADER")}</Header>
        <Card>
          <div className="payment-amount-info">
            <CardLabelDesc className="dark">{t("PAYMENT_CS_TOTAL_AMOUNT_DUE")}</CardLabelDesc>
            <CardSectionHeader> ₹ {paymentAmount || billDetails?.totalAmount}</CardSectionHeader>
          </div>
          <CardLabel>{t("PAYMENT_CS_SELECT_METHOD")}</CardLabel>
          {menu?.length && (
            <Controller
              name="paymentType"
              defaultValue={menu[0]}
              control={control}
              render={(props) => <RadioButtons selectedOption={props.value} options={menu} onSelect={props.onChange} />}
            />
          )}
          {!showToast&&<SubmitBar label={t("PAYMENT_CS_BUTTON_LABEL")} submit={true} />}
        </Card>
      </form>
      <InfoBanner label={t("CS_COMMON_INFO")} text={t("CS_PAYMENT_REDIRECT_NOTICE")} />
      {showToast && (
        <Toast
          error={showToast.key}
          label={t(showToast.label)}
          onClose={() => {
            setShowToast(null);
          }}
        />
      )}
    </React.Fragment>
  );
};
