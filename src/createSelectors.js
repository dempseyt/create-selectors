import * as R from "ramda";

const RESERVED_WORDS = ["_selector", "_export", "_default"];

function stateSelector(selectorSpecification) {
  return {
    selectState: Object.hasOwn(selectorSpecification, "_selector")
      ? selectorSpecification["_selector"]
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

function selectorReducer(selectorSpecification) {
  const selectors = stateSelector(selectorSpecification);
  Object.entries(selectorSpecification).reduce(
    (accumulatedSelectors, [propertyName, propertySpec]) => {
      if (RESERVED_WORDS.includes(propertyName)) {
        return accumulatedSelectors;
      }

      const selectorFunction = (_state) => {
        const state = selectors.selectState(_state);
        return Object.hasOwn(state, propertyName) &&
          state[propertyName] !== undefined
          ? state[propertyName]
          : getDefaultValue(propertySpec);
      };

      const selectorName = createSelectorName(propertyName);
      accumulatedSelectors[selectorName] = selectorFunction;
      return selectors;
    },
    selectors
  );
  return selectors;
}

function createSelectors(selectorSpecification) {
  const selectors = selectorReducer(selectorSpecification);
  return selectors;
}

export default createSelectors;
