const yoinkCache = {};

function installYoink() {
    let path = window.location.href;
    path = toPartialUrl(path);
    yoinkCache[path] = document.getElementById("yoink-content").innerHTML;
    document.body.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    installPreYoink(document.body);
}

function onClick(event) {
    const target = event.target;
    if (target.tagName.toLowerCase() == "a") {
        if (target.href.endsWith(".html")) {
            event.preventDefault();
            yoink(target.href);
        }
    }
}

function installPreYoink(root) {
    const links = root.querySelectorAll("a");
    for (const link of links) {
        link.addEventListener("mouseover", onHoverLink);
        link.addEventListener("touchstart", onHoverLink);
    }
}
function onHoverLink(event) {
    const target = event.target;
    if (target.href.endsWith(".html")) {
        preYoink(target.href);
    }
}

async function preYoink(href) {
    const url = toPartialUrl(href);
    if (yoinkCache[url] !== undefined) {
        return;
    }
    try {
        const fetchPromise = fetch(url);
        yoinkCache[url] = fetchPromise;
        const textPromise = fetchPromise.then(response=>response.text());
        yoinkCache[url] = textPromise;
    } catch (e) {
        delete yoinkCache[url];
    }
}

async function yoink(href, skipPushState) {
    const url = toPartialUrl(href);
    // todo: support promises in cache.
    let content = yoinkCache[url];
    if (content instanceof Promise) {
        try {
            content = await content;
        } catch (e) {
            console.error(e);
        }
    }
    if (content === undefined) {
        try {
            const response = await fetch(url);
            content = await response.text();
        } catch (e) {
            // fall back to link.
            window.location.href = href;
        }
        yoinkCache[url] = content;
    }
    const yoinkContent = document.getElementById("yoink-content");
    yoinkContent.innerHTML = content;
    installPreYoink(yoinkContent);
    if (!skipPushState) {
        history.pushState(undefined, undefined, href);
    }
}

function toPartialUrl(href) {
    let url;
    if (href.endsWith("/")) {
        url += "index.partial.html";
    } else {
        url = href.replace(/.html$/, ".partial.html");
    }
    return url;
}

function onPopState(event) {
    yoink(window.location.href, true);
}

document.addEventListener('DOMContentLoaded', installYoink);