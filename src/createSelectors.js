import R from "ramda";

const RESERVED_WORDS = [
  "_default",
  "_type",
  "_export",
  "_selector",
  "_alternative",
];

function createSelectorName(selectorName) {
  console.log(`selectorName: ${selectorName}`);
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

function _createSelectors(selectorSpec, prevSelectorNames) {
  const selectors = {
    selectState: selectorSpec._selector ?? R.identity,
  };

  return Object.entries(selectorSpec).reduce(
    (accSelectors, [propertyName, propertySpec]) => {
      if (RESERVED_WORDS.includes(propertyName)) {
        return accSelectors;
      } else if (propertySpec._export !== false) {
        let selectorName = createSelectorName(propertyName);
        if (prevSelectorNames.includes(selectorName)) {
          if (propertySpec._alternative !== undefined) {
            selectorName = createSelectorName(propertySpec._alternative);
          } else {
            throw new Error(
              `Invariant failed: The selector names [${selectorName}] are already in use. Please use an alternative name using '_name' or '_names'`
            );
          }
        }

        const defaultValue = getDefaultForPropertySelector(
          selectorSpec[propertyName]
        );

        const selectorFunction = (_state) => {
          const state = selectors.selectState(_state);
          return Object.hasOwn(state, propertyName) &&
            state[propertyName] !== undefined
            ? state[propertyName]
            : defaultValue;
        };

        accSelectors[selectorName] = selectorFunction;
        prevSelectorNames.push(selectorName);

        return {
          [selectorName]: selectorFunction,
          ...accSelectors,
          ..._createSelectors(
            {
              ...propertySpec,
              _selector: selectorFunction,
            },
            prevSelectorNames
          ),
        };
      }
      return accSelectors;
    },
    selectors
  );
}

function createSelectors(selectorSpec) {
  return _createSelectors(selectorSpec, []);
}

export default createSelectors;
