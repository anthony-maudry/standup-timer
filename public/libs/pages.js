/**
 * Created by tony on 21/02/17.
 */
let pages = {
    displayPage : (page) => {
        for (element of document.querySelectorAll(`.page:not(.${page})`)) {
            if (!element.classList.contains('no-display')) {
                element.classList.add('no-display');
            }
        }

        document.querySelector(`.page.${page}`).classList.remove('no-display');
        if (document.querySelector(`.page.${page} .focus-in`)) {
            document.querySelector(`.page.${page} .focus-in`).focus();
        }
    },

    updateContent : (placeholder, data) => {
        let elements = document.querySelectorAll(`[data-content="${placeholder}"]`);

        for (let element of elements) {
            let templateName = element.dataset.template,
                template = templateName && templates[templateName] ? templates[templateName] : '{0}',
                loop = element.dataset.loop;
            if (typeof loop !== 'undefined') {
                console.log('loop');
                element.innerHTML = '';
                for (let item of data) {
                    if (!(item instanceof Array) && !(item instanceof Object)) {
                        item = [item];
                    }
                    element.innerHTML += template.format(item);
                }
            } else {
                console.log('no loop');
                if (!(data instanceof Array) && !(data instanceof Object)) {
                    console.log('string');
                    data = [data];
                }
                element.innerHTML = template.format(data);
            }
        }
    }
};
