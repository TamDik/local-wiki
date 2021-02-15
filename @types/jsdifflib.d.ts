declare namespace difflib {
    type Opcode = ['equal'|'insert'|'delete'|'replace', number, number, number, number];
    class SequenceMatcher {
        constructor(base: string[], newtxt: string[]);
        get_opcodes(): Opcode[];
    }
}
