function expandMathematicalExpressions(): void {
    const EXPANDED_CLASS: string = 'expanded-math';

    const maths: NodeListOf<Element> = document.body.querySelectorAll(`math:not(.${EXPANDED_CLASS})`);
    for (const math of maths) {
        const tex: string = math.innerHTML;
        window.ipcApi.tex2svg(tex)
        .then(result => {
            math.classList.add('d-none', EXPANDED_CLASS);
            const span: HTMLElement = document.createElement('span');
            if (result.success) {
                span.innerHTML = result.output;
            } else {
                span.innerHTML = tex + `<span class="text-danger"> (Error: ${result.message}) </span>`
            }
            (math.parentElement as HTMLElement).insertBefore(span, math);
        });
    }
}


View.addUpdateAction(expandMathematicalExpressions);
