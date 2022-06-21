export class RatedLetterTree {
    public letter: RatedLetterAtPosition = null;
    
    public set root(root : RatedLetterAtPosition) {
        this.letter = root;
        this.notInWord = new RatedLetterTree();
        this.rightPosition = new RatedLetterTree();
        this.wrongPosition = new RatedLetterTree();
    }
    
    notInWord: RatedLetterTree = null;
    rightPosition: RatedLetterTree = null;
    wrongPosition: RatedLetterTree = null;
}

export class RatedLetterTree2 {
    public letter: RatedLetterAtPosition = null;
    
    public set root(root : RatedLetterAtPosition) {
        this.letter = root;
        this[0] = new RatedLetterTree();
        this[1] = new RatedLetterTree();
        this[2] = new RatedLetterTree();
    }
    
    0: RatedLetterTree = null;
    1: RatedLetterTree = null;
    2: RatedLetterTree = null;
}

export interface RatedLetterAtPosition2 {
    letter: string;
    0: RatingOfLetter,
    1: RatingOfLetter,
    2: RatingOfLetter
}

export interface RatingOfLetter {
    probability: number,
    filteredWords: string[]
}

export interface RatedLetterAtPosition {
    letter: string;
    notInWord: RatingOfLetter,
    rightPosition: RatingOfLetter,
    wrongPosition: RatingOfLetter
}