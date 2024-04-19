import R from 'ramda'

function createSelectors(selectorSpec) {
    const selectors = {
        selectState: selectorSpec._selector ?? R.identity
    }

    return selectors
}

export default createSelectors;