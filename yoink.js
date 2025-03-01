/** 
 * A cache with keys representing page URLs and values that are 
 * Element|Promise<Element> for the rendered page. 
 */
const yoinkCache = {};

var offscreen = document.createElement('div');

/** Installs yoink */
function installYoink() {
    document.body.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    installPreYoink(document.body);
    addInitialContentToCache();

    offscreen.className = "offscreen";
    document.body.appendChild(offscreen);
}

function addInitialContentToCache() {
    const path = toPartialUrl(window.location.href);
    yoinkCache[path] = document.getElementById("yoink-content");
}

/** Body onclick listener for intercepting anchor clicks. */
function onClick(event) {
    const target = event.target;
    if (window.event.metaKey || event.button !== 0) {
        return;
    }
    if (target.tagName.toLowerCase() == "a") {
        if (target.href.endsWith(".html")) {
            event.preventDefault();
            yoink(target.href);
        }
    }
}

/** Installs hover listener on all descendent anchors. */
function installPreYoink(root) {
    const links = root.querySelectorAll("a");
    for (const link of links) {
        // Mouse support.
        link.addEventListener("mouseover", onHoverLink);
        // Touch support.
        link.addEventListener("touchstart", onHoverLink);
        // Accessibility support.
        link.addEventListener("focusin", onHoverLink);
    }
}

/** Prefetches hovered links ending with .html. */
function onHoverLink(event) {
    const target = event.target;
    if (target.href.endsWith(".html")) {
        preYoink(target.href);
    }
}

/** Prefetches the link, adding it to the cache. */
async function preYoink(href, installOffscreen) {
    const url = toPartialUrl(href);
    if (yoinkCache[url] !== undefined) {
        return yoinkCache[url];
    }
    const promise = fetch(url)
        .then(response => response.text())
        .then(text => preRender(url, text, installOffscreen))
        .catch(e => {
            delete yoinkCache[url];
        });
    yoinkCache[url] = promise;
    return promise;
}

/** 
 * Resolves new URL by loading its contents from the cache and replacing the 
 * existing content. 
 */
async function yoink(href, skipPushState) {
    const url = toPartialUrl(href);
    // todo: support promises in cache.
    let content = yoinkCache[url];
    let element;
    if (content instanceof Element) {
        element = content;
    } else if (content instanceof Promise) {
        try {
            element = await content;
        } catch (e) {
            console.error(e);
        }
    }
    if (element === undefined) {
        try {
            element = await preYoink(href, false);
        } catch (e) {
            // fall back to link.
            window.location.href = href;
        }
    }
    const oldYoinkContent = document.getElementById("yoink-content");
    const parent = oldYoinkContent.parentNode;
    const sibling = oldYoinkContent.nextSibling;
    // TODO: add it back in the same exact location.
    parent.removeChild(oldYoinkContent);
    oldYoinkContent.classList.add("yoink-hidden");
    offscreen.appendChild(oldYoinkContent);
    delete offscreen.id;
    element.id = "yoink-content";
    element.classList.remove("yoink-hidden");
    if (sibling) {
        parent.insertBefore(element, sibling);
    } else {
        parent.appendChild(element);
    }
    if (!skipPushState) {
        history.pushState(undefined, undefined, href);
    }
}

/** Converts an URL to its partial file equivalent. */
function toPartialUrl(href) {
    if (href.endsWith("/")) {
        href += "index.partial.html";
    } else {
        href = href.replace(/.html$/, ".partial.html");
    }
    return href;
}

/** Handles popstate for history back/forwards. */
function onPopState(event) {
    yoink(window.location.href, true);
}


/** 
 * Pre-renders content and inserts it into the cache. 
 * 
 * If the URL has already been prerendered, it simply returns the existing element.
 */
function preRender(url, content, installOffscreen) {
    const maybeElement = yoinkCache[url];
    if (maybeElement instanceof Element) {
        return maybeElement; // already prerendered.
    }
    const element = document.createElement('div');
    element.className = "yoink-content";
    element.innerHTML = content;
    yoinkCache[url] = element;
    if(installOffscreen !== false) {
        offscreen.appendChild(element);
        maybeHideAfterRender(element);
    }
    installPreYoink(element);
    // Allow the content to be rendered for one frame to speed up subsequent render.
    return element;
}

/** 
 * Hides elements inside of the offscreen container so they do not incur 
 * subsequent layout costs while hidden. 
 */
function maybeHideAfterRender(element) {
    requestAnimationFrame(() => {
        // Executed before the next frame is painted.
        setTimeout(() => {
            // Executed after the next frame is painted.
            if(element.parentNode === offscreen) {
                element.classList.add("yoink-hidden");
            }
        })
    })
}

document.addEventListener('DOMContentLoaded', installYoink);