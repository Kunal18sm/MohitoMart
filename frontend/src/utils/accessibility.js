const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const isMeaningfulLabel = (value) => normalizeText(value).length > 0;

const readLabelFromForAttribute = (element) => {
    const elementId = normalizeText(element.id);
    if (!elementId) {
        return '';
    }

    const explicitLabel = document.querySelector(`label[for="${elementId}"]`);
    return normalizeText(explicitLabel?.textContent);
};

const readNearestLabelText = (element) => {
    const wrappedLabel = element.closest('label');
    if (wrappedLabel) {
        return normalizeText(wrappedLabel.textContent);
    }

    const fieldContainer = element.parentElement;
    if (!fieldContainer) {
        return '';
    }

    const siblingLabel = fieldContainer.querySelector('label');
    if (siblingLabel?.contains(element)) {
        return '';
    }

    return normalizeText(siblingLabel?.textContent);
};

const deriveFormControlLabel = (element) => {
    if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
        return '';
    }

    return (
        readLabelFromForAttribute(element) ||
        readNearestLabelText(element) ||
        normalizeText(element.getAttribute('placeholder')) ||
        normalizeText(element.getAttribute('name')) ||
        normalizeText(element.getAttribute('title')) ||
        normalizeText(element.dataset.label) ||
        (element.tagName === 'SELECT' ? 'Selection field' : 'Form field')
    );
};

const deriveButtonLabel = (button) => {
    if (button.getAttribute('aria-label') || button.getAttribute('aria-labelledby')) {
        return '';
    }

    const visibleText = normalizeText(button.textContent);
    if (visibleText) {
        return '';
    }

    const dataLabel = normalizeText(button.dataset.ariaLabel || button.dataset.label);
    if (dataLabel) {
        return dataLabel;
    }

    const imageAlt = normalizeText(button.querySelector('img[alt]')?.getAttribute('alt'));
    if (imageAlt) {
        return imageAlt;
    }

    const svgTitle = normalizeText(button.querySelector('svg title')?.textContent);
    if (svgTitle) {
        return svgTitle;
    }

    if (button.type === 'submit') {
        return 'Submit';
    }

    return 'Action button';
};

export const applyAccessibilityEnhancements = (root = document) => {
    if (typeof document === 'undefined' || !root?.querySelectorAll) {
        return;
    }

    root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((element) => {
        const label = deriveFormControlLabel(element);
        if (isMeaningfulLabel(label)) {
            element.setAttribute('aria-label', label);
        }
    });

    root.querySelectorAll('button').forEach((button) => {
        const label = deriveButtonLabel(button);
        if (isMeaningfulLabel(label)) {
            button.setAttribute('aria-label', label);
        }
    });
};
