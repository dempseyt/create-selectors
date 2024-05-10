import R, { length, prop } from "ramda";

const RESERVED_WORDS = [
  "_default",
  "_type",
  "_export",
  "_selector",
  "_alternative",
  "_name",
  "_names",
  "_key",
  "_func",
  "_propsKeys",
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

        const selectorFunction = (_state, props) => {
          const state = selectState(_state, props);

          if (Object.hasOwn(propertySpec, "_key")) {
            const key = propertySpec["_key"];
            const indexKey = props[key];
            return state[indexKey];
          }

          if (Object.hasOwn(propertySpec, "_func")) {
            let propArgs = [];
            if (Object.hasOwn(propertySpec, "_propsKeys")) {
              propArgs = propertySpec._propsKeys.reduce((args, currentKey) => {
                args.push(props[currentKey]);
                return args;
              }, []);
            } else if (Object.hasOwn(propertySpec, "_selectors")) {
              propArgs = propertySpec._selectors.reduce((args, selector) => {
                args.push(selector(state, props));
                return args;
              }, []);
            }

            return propertySpec["_func"](state, ...propArgs);
          }

          return state[propertyName] !== undefined &&
            Object.hasOwn(state, propertyName) &&
            state[propertyName] !== undefined
            ? state[propertyName]
            : defaultValue;
        };

        if (
          Object.hasOwn(propertySpec, "_name") &&
          Object.hasOwn(propertySpec, "_names")
        ) {
          throw new Error(
            `Invariant failed: You cannot use _name (${propertySpec["_name"]}) and _names (${propertySpec["_names"]}) at the same time.`
          );
        }
        if (Object.hasOwn(propertySpec, "_names")) {
          propertySpec["_names"].map((name) => {
            selectors.withOneName.push({
              names: [name],
              _nameProvided: true,
              propertySelector: selectorFunction,
            });
          });
        } else if (Object.hasOwn(propertySpec, "_name")) {
          selectors.withOneName.push({
            names: [propertySpec._name],
            _nameProvided: true,
            propertySelector: selectorFunction,
          });
        } else if (Object.hasOwn(propertySpec, "_alternative")) {
          selectors.withAlternativeName.push({
            names: [propertySpec._alternative],
            propertySelector: selectorFunction,
          });
        } else {
          selectors.withOneName.push({
            names: [propertyName],
            propertySelector: selectorFunction,
          });
        }

        return expandSelectors(
          {
            ...propertySpec,
            _selector: selectorFunction,
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
  const createSelector = (
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
    selectorsWithAndWithoutAlternatives.withOneName.reduce(
      createSelector,
      selectors
    );

  const checkedSelectorNames =
    selectorsWithAndWithoutAlternatives.withAlternativeName.reduce(
      createSelector,
      uncheckedSelectorNames
    );
  return checkedSelectorNames;
}

export default createSelectors;
