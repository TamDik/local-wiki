interface MinHTMLElement {
}

interface IMathJax {
    tex2svg(tex: string): MinHTMLElement;
    tex2chtml(tex: string): MinHTMLElement;
    startup: {
        adaptor: {
            outerHTML: (node: MinHTMLElement) => string;
        }
    };
}


class MathJaxError extends Error {
    public constructor(message: string, public readonly tex: string) {
        super(message);
    }
}


let __MathJax: {svg: IMathJax|null, chtml: IMathJax|null} = {svg: null, chtml: null};
async function getMathJax(output: keyof typeof __MathJax): Promise<IMathJax> {
    if (__MathJax[output] === null) {
        __MathJax[output] = await require('mathjax').init({
            loader: {
                load: ['input/tex', `output/${output}`]
            },
            tex: {
                formatError: (jax: {latex: string}, err: {id: string, message: string}) => {
                    throw new MathJaxError(err.message, jax.latex);
                },
            }
        });
    }
    return __MathJax[output] as IMathJax;
}

async function tex2svg(tex: string): Promise<string> {
    const MathJax = await getMathJax('svg');
    const svg = MathJax.tex2svg(tex);
    return MathJax.startup.adaptor.outerHTML(svg);
}

async function tex2chtml(tex: string): Promise<string> {
    const MathJax = await getMathJax('chtml');
    const chtml = MathJax.tex2chtml(tex);
    return MathJax.startup.adaptor.outerHTML(chtml);
}

export {tex2svg, tex2chtml};
