import R from "ramda";

function createSelectorName(selectorName) {
  return `select${selectorName.charAt(0).toUpperCase()}${selectorName.slice(
    1
  )}`;
}

function createSelectors(selectorSpec) {
  const selectors = {
    selectState: selectorSpec._selector ?? R.identity,
  };

  for (const [key, value] of Object.entries(selectorSpec)) {
    if (value["_export"] !== false) {
      const selectorFunction = (_state) => {
        const state = selectors.selectState(_state);
        if (!Object.hasOwn(state, key) && Object.hasOwn(value, "_default")) {
          return value["_default"];
        }
        return state[key];
      };
      selectors[createSelectorName(key)] = selectorFunction;
    }
  }

  return selectors;
}

export default createSelectors;
