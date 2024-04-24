import R from "ramda";

function createSelectorName(selectorName) {
  return `select${selectorName.charAt(0).toUpperCase()}${selectorName.slice(
    1
  )}`;
}

function getDefaultValueForType(type) {
  if (type === "list") {
    return [];
  } else if (type === "index") {
    return {};
  }
}

function getDefaultForPropertySelector(propertySelectorSpec) {
  if (Object.hasOwn(propertySelectorSpec, "_default")) {
    return propertySelectorSpec["_default"];
  } else if (Object.hasOwn(propertySelectorSpec, "_type")) {
    return getDefaultValueForType(propertySelectorSpec["_type"]);
  }
}

function createSelectors(selectorSpec) {
  const selectors = {
    selectState: selectorSpec._selector ?? R.identity,
  };

  const createdSelectors = Object.entries(selectorSpec).reduce(
    (selectors, [propertyName, propertySelectorSpec]) => {
      if (propertySelectorSpec["_export"] !== false) {
        const selectorFunction = (_state, props) => {
          const state = selectors.selectState(_state, props);
          return !Object.hasOwn(state, propertyName)
            ? getDefaultForPropertySelector(propertySelectorSpec)
            : state[propertyName];
        };
        return {
          ...selectors,
          [createSelectorName(propertyName)]: selectorFunction,
        };
      }
    },
    selectors
  );
  return createdSelectors;
}

export default createSelectors;
