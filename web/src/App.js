import React from 'react';

import { initLibraries } from "@egovernments/digit-ui-libraries";
import { PGRModule, PGRLinks, PGRReducers } from "@egovernments/digit-ui-module-pgr";
import { FSMModule, FSMLinks } from "@egovernments/digit-ui-module-fsm";
import { PTModule, PTLinks } from "@egovernments/digit-ui-module-pt";
import { PaymentModule, PaymentLinks } from "@egovernments/digit-ui-module-common";
import { DigitUI } from "@egovernments/digit-ui-module-core";

initLibraries();

const enabledModules = ["PGR", "FSM", "Payment", "PT"];
window.Digit.ComponentRegistryService.setupRegistry({
  PGRLinks,
  PGRModule,
  FSMModule,
  FSMLinks,
  PTModule,
  PTLinks,
  PaymentModule,
  PaymentLinks,
});

const moduleReducers = (initData) => ({
  pgr: PGRReducers(initData),
});

function App() {
  const stateCode = window.globalConfigs?.getConfig("STATE_LEVEL_TENANT_ID") || process.env.REACT_APP_STATE_LEVEL_TENANT_ID;
  console.log("process .env", process.env)
  if (!stateCode) {
    return <h1>stateCode is not defined</h1>
  }
  return (
    <DigitUI stateCode={stateCode} enabledModules={enabledModules} moduleReducers={moduleReducers} />
  );
}

export default App;
