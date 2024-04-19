function createSelectors(selectorFns) {
    const selectors = selectorFns; 

    selectors.selectState = (state, whoKnows) => state

    return selectors
}

export default createSelectors;