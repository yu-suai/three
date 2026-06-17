// #20220228, for shelves

class BrowerRT {

    dom_getOffset(el) {
        const rect = el.getBoundingClientRect()
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY
        }
    }

}

const runtime = new BrowerRT()

export {
    runtime
} 
