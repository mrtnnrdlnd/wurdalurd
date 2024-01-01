import {filters} from "./Filters"

type RatedWord = {
    word: string,
    rating: number
}

type PartlyMemoizedRecursionCall = {NotInWord: Array<string>, WrongPosition: Array<string>, RightPosition: Array<string>};

type MemoCache = Map<string, PartlyMemoizedRecursionCall>;

function rateWordRecursiveSplit(firstPart: string, secondPart: string, words: Array<string>, probability: number, cache: MemoCache, steps: string): number {
    if (words.length === 0 || secondPart.length === 0) return words.length * probability;

    let count = 0;

    let NotInWord: Array<string> = [];
    let WrongPosition: Array<string> = [];
    let RightPosition: Array<string> = [];

    const letter = secondPart[0];
    const position = firstPart.length;
    firstPart = firstPart + secondPart[0];
    secondPart = secondPart.slice(1);

    const memoKey = `${firstPart}-${steps}`;
    if (cache.has(memoKey)) {
        ({ NotInWord, WrongPosition, RightPosition } = cache.get(memoKey)!);
    }
    else {
        for (const w of words) {
            if (filters.NotInWord(w, letter, position)) {
                NotInWord.push(w)
            }
            else if (filters.WrongPosition(w, letter, position)) {
                WrongPosition.push(w)
            }
            else if (filters.RightPosition( w, letter, position)) {
                RightPosition.push(w)
            }
        }

        if (firstPart.length < 4) {
            cache.set(`${firstPart}-${steps}`, {NotInWord, WrongPosition, RightPosition});
        }
    }
    
    count += NotInWord.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, NotInWord, probability * NotInWord.length/words.length, cache, steps + 'N') : 0;  
    count += WrongPosition.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, WrongPosition, probability * WrongPosition.length/words.length, cache, steps + 'W') : 0;
    count += RightPosition.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, RightPosition, probability * RightPosition.length/words.length, cache, steps + 'R') : 0;

    return count;
}

function rateWord(word: string, words: Array<string>, cache: MemoCache): number {
    return rateWordRecursiveSplit("", word, words, 1.0, cache, "");
}

function rateWords(guesses: Array<string>, answers: Array<string>): Array<RatedWord> {
    console.time("ratingWords");
    const cache: MemoCache = new Map();
    const timedRatedWords = answers.map(word => ({ word: word, rating: rateWord(word, guesses, cache) }))
    .sort((a, b) => a.rating - b.rating);
    console.timeEnd("ratingWords");
    console.log(cache)
    return timedRatedWords;
}

self.addEventListener('message', function(e) {
    // e.data contains the data passed to the worker
    const result = rateWords(e.data.answers, e.data.guesses) // Example operation
    // Post the result back to the main thread
    self.postMessage(result);
});