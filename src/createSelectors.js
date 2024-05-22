import R, { curry, length, prop, union } from "ramda";

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
  "_selectors",
  "_stateToProps",
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

const createRootStateAwareSelector = (
  outerStateSelector,
  outerStateAwareSelector
) => {
  return (rootState, props) => {
    const outerState = outerStateSelector(rootState, props);
    return outerStateAwareSelector(outerState, props);
  };
};

const getIsObjectsShallowlyEqual = (object1, object2) => {
  if (Object.keys(object1).length !== Object.keys(object2).length) {
    return false;
  }

  return Object.entries(object1).reduce((changeFound, [key, value]) => {
    return changeFound && value === object2[key];
  }, true);
};

const getIsShallowEqual = (previousArgument, currentArgument) => {
  const isPreviousArgumentObject = previousArgument instanceof Object;
  const isCurrentArgumentObject = currentArgument instanceof Object;
  if (!isPreviousArgumentObject && !isCurrentArgumentObject) {
    return previousArgument === currentArgument;
  } else if (isPreviousArgumentObject && isCurrentArgumentObject) {
    return getIsObjectsShallowlyEqual(previousArgument, currentArgument);
  } else {
    return false;
  }
};

const getIsRecomputationRequired = (previousArguments, currentArguments) => {
  return previousArguments[0] !== undefined &&
    previousArguments[1] !== undefined
    ? !isCachedResultValid(previousArguments, currentArguments)
    : true;
};

function isCachedResultValid([previousState, previousProps], [state, props]) {
  const isPropsSame = getIsShallowEqual(previousProps, props);
  const isStateSame = getIsShallowEqual(previousState, state);
  return isStateSame && isPropsSame;
}

const createMemoizedSelector = (outerStateAwareSelector) => {
  let cachedResult;
  let numberOfComputations = 0;
  let previousArguments = [undefined, undefined];

  const memoizedSelector = (outerState, props) => {
    if (getIsRecomputationRequired(previousArguments, [outerState, props])) {
      previousArguments = [outerState, props];
      numberOfComputations++;
      cachedResult = outerStateAwareSelector(outerState, props);
    }
    return cachedResult;
  };

  memoizedSelector.recomputations = () => numberOfComputations;
  return memoizedSelector;
};

const resolvePropertyName = (propertyName) => {
  return propertyName.startsWith("$") ? propertyName.slice(1) : propertyName;
};

function createSelectorFunction(
  propertyName,
  selectorSpecification,
  outerStateSelector
) {
  const defaultValue = getDefaultForPropertySelector(selectorSpecification);
  const outerStateAwareSelector = (outerState, props) => {
    const resolvedPropertyName = resolvePropertyName(propertyName);
    if (Object.hasOwn(selectorSpecification, "_key")) {
      const key = selectorSpecification["_key"];
      const indexKey = props[key];
      return outerState[indexKey];
    }

    if (Object.hasOwn(selectorSpecification, "_func")) {
      let propArgs = [];
      if (Object.hasOwn(selectorSpecification, "_propsKeys")) {
        propArgs = selectorSpecification._propsKeys.reduce(
          (args, currentKey) => {
            args.push(props[currentKey]);
            return args;
          },
          []
        );
      } else if (Object.hasOwn(selectorSpecification, "_selectors")) {
        propArgs = selectorSpecification._selectors.reduce((args, selector) => {
          args.push(selector(outerState, props));
          return args;
        }, []);
      }

      return selectorSpecification["_func"](outerState, ...propArgs);
    }

    return outerState[resolvedPropertyName] !== undefined &&
      Object.hasOwn(outerState, resolvedPropertyName) &&
      outerState[resolvedPropertyName] !== undefined
      ? outerState[resolvedPropertyName]
      : defaultValue;
  };

  const memoizedSelector = createMemoizedSelector(outerStateAwareSelector);

  const rootStateSelector = createRootStateAwareSelector(
    outerStateSelector,
    memoizedSelector
  );

  rootStateSelector.recomputations = memoizedSelector.recomputations;

  return rootStateSelector;
}

const getIsForExport = (propertyName, selectorSpecification) =>
  !propertyName.startsWith("$") && selectorSpecification._export !== false;

const createSelectorWithInjectedProps = (selector, selectorSpecification) => {
  if (Object.hasOwn(selectorSpecification, "_stateToProps")) {
    return (state, props) => {
      const propsToInject = Object.entries(
        selectorSpecification["_stateToProps"]
      ).reduce((propsToInject, [key, currentSelector]) => {
        return { ...propsToInject, [key]: currentSelector(state, props) };
      }, props);
      return selector(state, propsToInject);
    };
  }

  return selector;
};

function expandSelectors(
  selectorSpecifications,
  selectors = {
    withOneName: [],
    withAlternativeName: [],
  },
  parentSelector
) {
  return Object.entries(selectorSpecifications).reduce(
    (selectors, [propertyName, selectorSpecification]) => {
      if (RESERVED_WORDS.includes(propertyName)) {
        return selectors;
      } else {
        const currentSelector = createSelectorFunction(
          propertyName,
          selectorSpecification,
          parentSelector
        );
        const isForExport = getIsForExport(propertyName, selectorSpecification);
        const selectorWithInjectedProps = createSelectorWithInjectedProps(
          currentSelector,
          selectorSpecification
        );
        if (
          Object.hasOwn(selectorSpecification, "_name") &&
          Object.hasOwn(selectorSpecification, "_names")
        ) {
          throw new Error(
            `Invariant failed: You cannot use _name (${selectorSpecification["_name"]}) and _names (${selectorSpecification["_names"]}) at the same time.`
          );
        }

        if (Object.hasOwn(selectorSpecification, "_names")) {
          selectorSpecification["_names"].map((name) => {
            selectors.withOneName.push({
              names: [name],
              _nameProvided: true,
              propertySelector: selectorWithInjectedProps,
              isForExport,
            });
          });
        } else if (Object.hasOwn(selectorSpecification, "_name")) {
          selectors.withOneName.push({
            names: [selectorSpecification._name],
            _nameProvided: true,
            propertySelector: selectorWithInjectedProps,
            isForExport,
          });
        } else if (Object.hasOwn(selectorSpecification, "_alternative")) {
          selectors.withAlternativeName.push({
            names: [selectorSpecification._alternative],
            propertySelector: selectorWithInjectedProps,
            isForExport,
          });
        } else {
          selectors.withOneName.push({
            names: [propertyName],
            propertySelector: selectorWithInjectedProps,
            isForExport,
          });
        }

        return expandSelectors(
          selectorSpecification,
          selectors,
          selectorWithInjectedProps
        );
      }
    },
    selectors
  );
}

function createSelectors(selectorSpecifications) {
  const rootStateSelector = createStateSelector(selectorSpecifications);
  const selectors = {
    selectState: rootStateSelector,
  };
  const selectorsWithAndWithoutAlternatives = expandSelectors(
    selectorSpecifications,
    undefined,
    rootStateSelector
  );
  const createSelectorReducer = (
    accumulatedSelectors,
    { names, _nameProvided, propertySelector, isForExport }
  ) => {
    if (!isForExport) {
      return accumulatedSelectors;
    }
    const selectorNames = names.map((name) => {
      if (_nameProvided) {
        return name;
      }
      return createSelectorName(name);
    });
    for (const selectorName of selectorNames) {
      if (!Object.hasOwn(accumulatedSelectors, selectorName)) {
        accumulatedSelectors[selectorName] = propertySelector;
        return accumulatedSelectors;
      }
    }
    throwInvariantErrorMsg(selectorNames);
  };

  const selectorsWithSingleName =
    selectorsWithAndWithoutAlternatives.withOneName.reduce(
      createSelectorReducer,
      selectors
    );

  const renamedSelectors =
    selectorsWithAndWithoutAlternatives.withAlternativeName.reduce(
      createSelectorReducer,
      selectorsWithSingleName
    );

  return renamedSelectors;
}

export default createSelectors;
