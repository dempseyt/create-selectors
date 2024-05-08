import * as R from "ramda";

const RESERVED_WORDS = ["_selector"];

function stateSelector(selectorSpecification) {
  return {
    selectState: Object.hasOwn(selectorSpecification, "_selector")
      ? selectorSpecification._selector
      : R.identity,
  };
}

function createSelectorName(propertyName) {
  return `select${propertyName.charAt(0).toUpperCase()}${propertyName.slice(
    1
  )}`;
}

function createSelectors(selectorSpecification) {
  const selectors = stateSelector(selectorSpecification);

  Object.entries(selectorSpecification).reduce(
    (accumulatedSelectors, [propertyName, propertySpec]) => {
      const selectorFunction = (state) => {
        return state.propertyName;
      };
      if (Object.hasOwn(propertySpec, "_export")) {
        const selectorName = createSelectorName(propertyName);
        accumulatedSelectors[selectorName] = selectorFunction;
        console.log(accumulatedSelectors);
      }
    },
    selectors
  );

  // console.log(`selectors: ${JSON.stringify(selectors)}`);
  // console.log(`selectorSpec: ${JSON.stringify(selectorSpecification)}`);

  return selectors;
}

export default createSelectors;
