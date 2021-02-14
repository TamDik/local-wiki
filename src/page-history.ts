const olds: NodeListOf<HTMLInputElement>  = document.querySelectorAll('input[type="radio"][name="old"]' ) as NodeListOf<HTMLInputElement>;
const diffs: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[type="radio"][name="diff"]') as NodeListOf<HTMLInputElement>;

for (const old of olds) {
    old.onclick = oldRadioClickedEvent;
}

for (const diff of diffs) {
    diff.onclick = diffRadioClickedEvent;
}

function oldRadioClickedEvent(event: MouseEvent): void {
    const old: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const li: HTMLLIElement = getParentLI(old);
    li.classList.add('selected', 'after');
    li.classList.remove('between');

    for (const prevLi of prevAll(li).filter(prev => prev.classList.contains('after'))) {
        prevLi.classList.remove('after', 'selected');
        prevLi.classList.add('between');
    }
    for (const nextLi of nextAll(li)) {
        if (nextLi.classList.contains('between')) {
            nextLi.classList.remove('between');
            nextLi.classList.add('after');
        }
        nextLi.classList.remove('selected');
    }
}

function diffRadioClickedEvent(event: MouseEvent): void {
    const diff: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const li: HTMLLIElement = getParentLI(diff);
    li.classList.add('selected', 'before');
    li.classList.remove('between');

    for (const prevLi of prevAll(li)) {
        if (prevLi.classList.contains('between')) {
            prevLi.classList.remove('between');
            prevLi.classList.add('before');
        }
        prevLi.classList.remove('selected');
    }
    for (const nextLi of nextAll(li).filter(next => next.classList.contains('before'))) {
        nextLi.classList.remove('before', 'selected');
        nextLi.classList.add('between');
    }
}

function getParentLI(radio: HTMLInputElement): HTMLLIElement {
    return radio.parentElement as HTMLLIElement;
}

function prevAll(element: Element): Element[] {
    const all: Element[] = [];
    let prev: Element|null = element.previousElementSibling;
    while (prev) {
        all.push(prev);
        prev = prev.previousElementSibling;
    }
    return all;
}

function nextAll(element: Element): Element[] {
    const all: Element[] = [];
    let next: Element|null = element.nextElementSibling;
    while (next) {
        all.push(next);
        next = next.nextElementSibling;
    }
    return all;
}

const compareButton: HTMLButtonElement = document.getElementById('compare-versions-button') as HTMLButtonElement;
compareButton.onclick = () => {
    let oldVersion: string = '';
    let diffVersion: string = '';
    for (const old of olds) {
        if (old.checked) {
            oldVersion = old.value
            break;
        }
    }
    for (const diff of diffs) {
        if (diff.checked) {
            diffVersion = diff.value;
            break;
        }
    }
    const params: Params = new Params();
    location.href = `?${Params.PATH_KEY}=Special:PageDiff&page=${params.path}&old=${oldVersion}&diff=${diffVersion}`;
};
