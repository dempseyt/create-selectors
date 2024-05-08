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

function getDefaultValue(propertySpec) {
  if (Object.hasOwn(propertySpec, "_default")) {
    return propertySpec["_default"];
  }
}

function createSelectors(selectorSpecification) {
  const selectors = stateSelector(selectorSpecification);

  Object.entries(selectorSpecification).reduce(
    (accumulatedSelectors, [propertyName, propertySpec]) => {
      const selectorFunction = (_state) => {
        const state = selectors.selectState(_state);
        return Object.hasOwn(state, propertyName) &&
          state[propertyName] !== undefined
          ? state[propertyName]
          : getDefaultValue(propertySpec);
      };

      const selectorName = createSelectorName(propertyName);
      accumulatedSelectors[selectorName] = selectorFunction;
    },
    selectors
  );

  // console.log(`selectors: ${JSON.stringify(selectors)}`);
  // console.log(`selectorSpec: ${JSON.stringify(selectorSpecification)}`);

  return selectors;
}

export default createSelectors;
