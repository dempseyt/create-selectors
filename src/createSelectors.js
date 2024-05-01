import R from "ramda";

const reservedWords = ["_default", "_type", "_export", "_selector"];

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

  return Object.keys(selectorSpec).reduce((selectors, propertyName) => {
    if (reservedWords.includes(propertyName)) {
      return selectors;
    } else if (selectorSpec[propertyName]._export !== false) {
      const selectorName = createSelectorName(propertyName);
      const defaultValue = getDefaultForPropertySelector(
        selectorSpec[propertyName]
      );
      const selector = (_state) => {
        const state = selectors.selectState(_state);
        return Object.hasOwn(state, propertyName)
          ? state[propertyName]
          : defaultValue;
      };
      return {
        ...selectors,
        [selectorName]: selector,
        ...createSelectors({
          ...selectorSpec[propertyName],
          _selector: selector,
        }),
      };
    }
    return selectors;
  }, selectors);
}

export default createSelectors;
