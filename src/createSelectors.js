import R, { prop } from "ramda";

const RESERVED_WORDS = [
  "_default",
  "_type",
  "_export",
  "_selector",
  "_alternative",
  "_name",
];

const createStateSelector = (selectorSpec) => {
  return selectorSpec._selector ?? R.identity;
};

const createSelectorName = (propertyName) => {
  return `select${propertyName.charAt(0).toUpperCase()}${propertyName.slice(
    1
  )}`;
};

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

        if (Object.hasOwn(propertySpec, "_name")) {
          selectors.withAlternativeName.push({
            names: [propertySpec._name],
            _nameProvided: true,
            propertySelector: selector,
          });
        } else if (Object.hasOwn(propertySpec, "_alternative")) {
          selectors.withAlternativeName.push({
            names: [propertySpec._alternative],
            propertySelector: selector,
          });
        } else {
          selectors.withOneName.push({
            names: [propertyName],
            propertySelector: selector,
          });
        }
        console.log(selectors.withAlternativeName);

        return expandSelectors(
          {
            ...propertySpec,
            _selector: selector,
          },
          selectors
        );
      }
      return selectors;
    },
    selectors
  );
}

function createSelectors(selectorSpec) {
  const selectors = { selectState: createStateSelector(selectorSpec) };
  const selectorsWithAndWithoutAlternatives = expandSelectors(selectorSpec);
  const reducer = (
    selectorsWithMethodNames,
    { names, _nameProvided, propertySelector }
  ) => {
    const selectorNames = names.map((name) => {
      if (_nameProvided) {
        return name;
      }
      return createSelectorName(name);
    });
    for (const selectorName of selectorNames) {
      if (!Object.hasOwn(selectorsWithMethodNames, selectorName)) {
        selectorsWithMethodNames[selectorName] = propertySelector;
        return selectorsWithMethodNames;
      }
    }
    throwInvariantErrorMsg(selectorNames);
  };

  const uncheckedSelectorNames =
    selectorsWithAndWithoutAlternatives.withOneName.reduce(reducer, selectors);

  const checkedSelectorNames =
    selectorsWithAndWithoutAlternatives.withAlternativeName.reduce(
      reducer,
      uncheckedSelectorNames
    );
  return checkedSelectorNames;
}

export default createSelectors;
