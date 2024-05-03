import R, { prop } from "ramda";

const RESERVED_WORDS = [
  "_default",
  "_type",
  "_export",
  "_selector",
  "_alternative",
];

const createStateSelector = (selectorSpec) => {
  return {
    selectState: selectorSpec._selector ?? R.identity,
  };
};

function createSelectorName(
  propertyName,
  propertySelectorSpec,
  previousSelectorNames
) {
  let _createSelectorName = (propertyName) =>
    `select${propertyName.charAt(0).toUpperCase()}${propertyName.slice(1)}`;

  const selectorName = _createSelectorName(propertyName);

  if (previousSelectorNames.includes(propertyName)) {
    if (Object.hasOwn(propertySelectorSpec, "_alternative")) {
      return _createSelectorName(propertySelectorSpec["_alternative"]);
    }
    throw new Error(
      `Invariant failed: The selector names [${selectorName}] are already in use. Please use an alternative name using '_name' or '_names'`
    );
  }
  return selectorName;
}

function throwInvariantErrorMsg(selectorName) {
  throw new Error(
    `Invariant failed: The selector names [${selectorName}] are already in use. Please use an alternative name using '_name' or '_names'`
  );
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
function expandSelectors(
  selectorSpec,
  selectors = {
    withOneName: [],
    withAlternativeName: [],
  }
) {
  const selectState = createStateSelector(selectorSpec);

  return Object.entries(selectorSpec).reduce(
    (selectors, [propertyName, propertySpec]) => {
      if (RESERVED_WORDS.includes(propertyName)) {
        return selectors;
      } else if (propertySpec._export !== false) {
        const defaultValue = getDefaultForPropertySelector(
          selectorSpec[propertyName]
        );

        const selector = (_state) => {
          const state = selectState(_state);

          return state[propertyName] !== undefined &&
            Object.hasOwn(state, propertyName) &&
            state[propertyName] !== undefined
            ? state[propertyName]
            : defaultValue;
        };

        if (Object.hasOwn(propertySpec, "_alternative")) {
          withAlternativeName.push({
            name: [propertyName, propertySpec._alternative],
            propertySelector: selector,
          });
        } else {
          withOneName.push({
            name: propertyName,
            propertySelector: selector,
          });
        }

        return expandSelectors({
          ...propertySpec,
          _selector: selector,
        });
      }
      return selectors;
    },
    selectors
  );
}

function createSelectors(selectorSpec) {
  const selectors = { selectState: createStateSelector(selectorSpec) };
  const selectorsWithMethodNames = expandSelectors(selectorSpec);

  const reducer = (selectorsWithMethodNames, {names, propertySpec: propertySelector}) => {
    const selectorNames = selectorsWithMethodNames.map((name) => createSelectorName(name))
    for (const selectorName of selectorNames) {
      if (!Object.hasOwn(selectorsWithMethodNames, selectorName)) {
        selectorsWithMethodNames[selectorName] = propertySelector
        return selectorsWithMethodNames
      }
    }
  }
  throwInvariantErrorMsg(selectorNames)

  const 
}

export default createSelectors;
