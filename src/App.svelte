<script lang="ts">
	import { Filters } from './Filters';
	import { RatedLetterTree, RatingOfLetter, RatedLetterAtPosition } from './Ratings';

	import { wordsLengthFive } from './wordsLengthFiveShort'

	let words: string[] = wordsLengthFive;
	let filteredWords: string[] = words;
	let displayedWords: string[];

	let wordLength = 5;
	let nrOfRows = 6;

	let letters: string[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(""));
	let filters: Function[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(Filters.noFilter));

	// let ratedWordsList: string[] = [...ratedWords3(words, filteredWords).keys()];
	// console.log(ratedWordsList)
	// ratedWordsList.slice(0, 10).forEach((word) => {
	// 	let benchmarkResult = benchmark(ratedWordsList, word);
	// 	console.log(word + ", " + average(benchmarkResult) + ", " + benchmarkResult.length);
	// });

	// let t0 = performance.now();
	// let benchmarkResult = benchmark(words, "trace");
	// console.log(benchmarkResult);
	// console.log(average(benchmarkResult));
	// let t1 = performance.now();
	// console.log(t1 - t0);

	// let t0 = performance.now();
	// console.log(ratedWords3(words, filteredWords));
	// let t1 = performance.now();
	// console.log(t1 - t0);

	function average(numbers: number[]): number {
		let sum: number = 0;
		numbers.forEach((n) => sum += n);
		return sum / numbers.length;
	}

	function benchmark(words: string[], firstGuess: string): number[] {
		let filteredWords;

		// let randomWord: string;
		let guess: string;
		let attemts: number[] = [];

		// for (let i = 0; i < 1000; i++) {
		words.forEach((word) => {
			filteredWords = words;
			// randomWord = pickRandomWord(words);

			for (let attemt = 1; attemt <= 6; attemt++) {
				// console.log(filteredWords.length)
				if (filteredWords.length > 0 && filteredWords.length <= 4) {
					// guess = [...ratedWords(filteredWords, filteredWords).keys()][0];
					guess = [...ratedWords3(filteredWords, filteredWords).keys()][0];
				}
				else if (filteredWords.length > 2000) {
					guess = firstGuess
				}
				else if (filteredWords.length > 4) {
					// guess = [...ratedWords(words, filteredWords).keys()][0];

					guess = [...ratedWords3(words, filteredWords).keys()][0];
				}

				if (guess == word) {
					attemts.push(attemt);
					break;
				}

				let filters: Function[] = new Array<Function>(words[0].length);

				guess.split("").forEach((letter, i) => {
					if (word.charAt(i) == letter) {
						filters[i] = Filters.rightPosition;
					}
					if (!word.includes(letter)) {
						filters[i] = Filters.notInWord;
					}
					if (word.includes(letter) && word.charAt(i) != letter && countLetterInWord(word, letter) >= countLetterInWord(word.slice(0,i), letter)) {
						filters[i] = Filters.wrongPosition;
					}
					
				})

				filteredWords = filteredWords.filter((w) => {
					for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
						if (!filters[letterIndex](w, guess.charAt(letterIndex).toLocaleLowerCase(), letterIndex)) {
							return false;
						}
					}
					return true;
				});
				
			}	
			
			// console.log(word + ", " + attemts[attemts.length-1]);		
		});

		return attemts;
	}

	function countLetterInWord(word: string, letter:string) {
		return word.split(letter).length;
	}
	
	function pickRandomWord(words: string[]): string {
		return words[Math.floor(Math.random()*words.length)]
	}

	
	// function rateAlphabet(words: string[]): Map<string, number[]> {
	// 	const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
	// 	const wordLength = words[0].length;
	// 	const totalNrOfWords = words.length;

	// 	let ratedAlphabet: Map<string, number[]> = new Map();

	// 	for (const letter of alphabet) {
	// 		// let used: boolean = letters[0].includes(letter);
	// 		let rating: number[] = new Array(wordLength + 1);
	// 		rating[wordLength] = words.filter((w) => w.includes(letter)).length;
	// 		for (let i = 0; i < wordLength; i++) {
	// 			rating[i] = Math.pow(words.filter((w) => Filters.rightPosition(w, letter, i)).length, 2);
	// 			rating[i] += Math.pow(words.filter((w) => Filters.wrongPosition(w, letter, i)).length, 2);
	// 			rating[i] += Math.pow(words.filter((w) => Filters.notInWord(w, letter, i)).length, 2);
	// 			rating[i] /= totalNrOfWords;
	// 			// if (used) {
	// 			// 	rating[i] *= 2;
	// 			// }
	// 		}

	// 		// if (letters[0].find((l) => l == letter)) {
				
	// 		// }

	// 		ratedAlphabet.set(letter, rating);
	// 	}

	// 	return ratedAlphabet;
	// }

	// function ratedWords(words: string[], filteredWords: string[]): Map<string, number> {
	// 	let ratedWords: Map<string, number> = new Map();
	// 	let sum: number;

	// 	let ratedAlphabet = rateAlphabet(filteredWords)


	// 	words.forEach((word) => {
	// 		sum = 0;
	// 		word.toLocaleLowerCase().split("").forEach((letter, i) => {
	// 			sum += ratedAlphabet.get(letter)[i];
				
	// 			if (word.split(letter).length > 2) {
	// 				sum += 5000;
	// 			}
	// 		})
	// 		ratedWords.set(word, sum)
	// 	})

	// 	return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
	// }

	function ratedWords3 (words: string[], filteredWords: string[]): Map<string, number> {
		let sortedWords = words.sort();
		let ratedWords: Map<string, number> = new Map();
		// let ratedLetter: RatedLetterAtPosition[] = [null, null, null, null, null, null, null, null, null, null, null, null, null];

		let ratedLetter: RatedLetterTree = new RatedLetterTree();

		ratedLetter.root = rateLetterAtPosition(filteredWords, sortedWords[0].charAt(0), 0);

		// console.log(ratedLetter)

		ratedLetter.notInWord.root = rateLetterAtPosition(ratedLetter.letter.notInWord.filteredWords, sortedWords[0].charAt(1), 1);
		ratedLetter.rightPosition.root = rateLetterAtPosition(ratedLetter.letter.rightPosition.filteredWords, sortedWords[0].charAt(1), 1);
		ratedLetter.wrongPosition.root = rateLetterAtPosition(ratedLetter.letter.wrongPosition.filteredWords, sortedWords[0].charAt(1), 1);

		for (let i = 0; i < sortedWords.length; i++) {
			const word = sortedWords[i];
			if (i > 0 && sortedWords[i - 1].charAt(0) != sortedWords[i].charAt(0)) {
				ratedLetter.root = rateLetterAtPosition(filteredWords, sortedWords[i].charAt(0), 0);


				ratedLetter.notInWord.root = rateLetterAtPosition(ratedLetter.letter.notInWord.filteredWords, sortedWords[i].charAt(1), 1);
				ratedLetter.rightPosition.root = rateLetterAtPosition(ratedLetter.letter.rightPosition.filteredWords, sortedWords[i].charAt(1), 1);
				ratedLetter.wrongPosition.root = rateLetterAtPosition(ratedLetter.letter.wrongPosition.filteredWords, sortedWords[i].charAt(1), 1);


				ratedLetter.notInWord.notInWord.root = rateLetterAtPosition(ratedLetter.notInWord.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.rightPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.wrongPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);

				ratedLetter.rightPosition.notInWord.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
				
				ratedLetter.wrongPosition.notInWord.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
			}
			else if (i > 0 && sortedWords[i - 1].charAt(1) != sortedWords[i].charAt(1)){
				ratedLetter.notInWord.root = rateLetterAtPosition(ratedLetter.letter.notInWord.filteredWords, sortedWords[i].charAt(1), 1);
				ratedLetter.rightPosition.root = rateLetterAtPosition(ratedLetter.letter.rightPosition.filteredWords, sortedWords[i].charAt(1), 1);
				ratedLetter.wrongPosition.root = rateLetterAtPosition(ratedLetter.letter.wrongPosition.filteredWords, sortedWords[i].charAt(1), 1);


				ratedLetter.notInWord.notInWord.root = rateLetterAtPosition(ratedLetter.notInWord.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.rightPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.wrongPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);

				ratedLetter.rightPosition.notInWord.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
				
				ratedLetter.wrongPosition.notInWord.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
			}
			else if (i > 0 && sortedWords[i - 1].charAt(2) != sortedWords[i].charAt(2)){
				ratedLetter.notInWord.notInWord.root = rateLetterAtPosition(ratedLetter.notInWord.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.rightPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.notInWord.wrongPosition.root = rateLetterAtPosition(ratedLetter.notInWord.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);

				ratedLetter.rightPosition.notInWord.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.rightPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.rightPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
				
				ratedLetter.wrongPosition.notInWord.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.notInWord.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.rightPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.rightPosition.filteredWords, sortedWords[i].charAt(2), 2);
				ratedLetter.wrongPosition.wrongPosition.root = rateLetterAtPosition(ratedLetter.wrongPosition.letter.wrongPosition.filteredWords, sortedWords[i].charAt(2), 2);
			} 
			ratedWords.set(sortedWords[i], rateWordRecursive(word, filteredWords, 0, 1, ratedLetter));
		}
		return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
	}


	function rateWordRecursive(word: string, words: string[], position: number, probability: number, ratedLetter?: RatedLetterTree): number {
		if (probability == 0) {
			return 0;
		}
		let sum = 0;

		let ratedLetterAtPosition: RatedLetterAtPosition = ratedLetter != null && ratedLetter.letter != null ? ratedLetter.letter : rateLetterAtPosition(words, word.charAt(position), position);

		if (position == word.length - 1) {
			sum += ratedLetterAtPosition.notInWord.filteredWords.length * ratedLetterAtPosition.notInWord.probability * probability;
			sum += ratedLetterAtPosition.rightPosition.filteredWords.length * ratedLetterAtPosition.rightPosition.probability * probability;
			sum += ratedLetterAtPosition.wrongPosition.filteredWords.length * ratedLetterAtPosition.wrongPosition.probability * probability;
		}
		if (position < word.length - 1) {
			sum += rateWordRecursive(word, ratedLetterAtPosition.notInWord.filteredWords, position + 1, ratedLetterAtPosition.notInWord.probability * probability, ratedLetter != null ? ratedLetter.notInWord : null);
			sum += rateWordRecursive(word, ratedLetterAtPosition.rightPosition.filteredWords, position + 1, ratedLetterAtPosition.rightPosition.probability * probability, ratedLetter != null ? ratedLetter.rightPosition : null);
			sum += rateWordRecursive(word, ratedLetterAtPosition.wrongPosition.filteredWords, position + 1, ratedLetterAtPosition.wrongPosition.probability * probability, ratedLetter != null ? ratedLetter.wrongPosition : null);
		}
		return sum;
	}


	
	function rateWordsRecursive(words: string[], index: number, position: number, probability: number, ratedLetter?: RatedLetterTree): number {
		let sum = 0;
		let ratedLetterAtPosition: RatedLetterAtPosition = ratedLetter.letter ?? rateLetterAtPosition(words, words[index].charAt(position), position);
		if (position == words[index].length - 1) {
			sum += ratedLetterAtPosition.notInWord.filteredWords.length * ratedLetterAtPosition.notInWord.probability * probability;
			sum += ratedLetterAtPosition.rightPosition.filteredWords.length * ratedLetterAtPosition.rightPosition.probability * probability;
			sum += ratedLetterAtPosition.wrongPosition.filteredWords.length * ratedLetterAtPosition.wrongPosition.probability * probability;
		}
		if (position < words[index].length - 1) {
			sum += rateWordsRecursive(ratedLetterAtPosition.notInWord.filteredWords, 0, position + 1, ratedLetterAtPosition.notInWord.probability * probability);
			sum += rateWordsRecursive(ratedLetterAtPosition.rightPosition.filteredWords, 0, position + 1, ratedLetterAtPosition.rightPosition.probability * probability);
			sum += rateWordsRecursive(ratedLetterAtPosition.wrongPosition.filteredWords, 0, position + 1, ratedLetterAtPosition.wrongPosition.probability * probability);
		}
		return sum;
	}
	

	interface RatingOfLetter {
		probability: number,
		filteredWords: string[]
	}

	interface RatedLetterAtPosition {
		letter: string;
		notInWord: RatingOfLetter,
		rightPosition: RatingOfLetter,
		wrongPosition: RatingOfLetter
	}

	function rateLetterAtPosition(words: string[], letter: string, position: number): RatedLetterAtPosition {
		const unfilteredNrOfWords = words.length;
		let ratedLetter: RatedLetterAtPosition = {
			letter: letter,
			notInWord: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.notInWord(w, letter, position))
			},
			rightPosition: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.rightPosition(w, letter, position))
			},
			wrongPosition: {
				probability: 0,
				filteredWords: words.filter((w) => Filters.wrongPosition(w, letter, position))
			}
		}
		if (unfilteredNrOfWords) {
			ratedLetter.notInWord.probability = ratedLetter.notInWord.filteredWords.length / unfilteredNrOfWords;
			ratedLetter.rightPosition.probability = ratedLetter.rightPosition.filteredWords.length / unfilteredNrOfWords;
			ratedLetter.wrongPosition.probability = ratedLetter.wrongPosition.filteredWords.length / unfilteredNrOfWords;
		}
		return ratedLetter;
	}






	// View stuffs
	
	function handleInput(e: Event, i, j) {
		const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
		let inputEvent = e as InputEvent;
		if (inputEvent.data == null) {
			filters[i][j] = Filters.noFilter
			document.getElementById(i.toString().concat(j)).style.backgroundColor = "";
		}
		else if (alphabet.includes(inputEvent.data.toLocaleLowerCase())) {
			focusNext(i,j);
		}
		
	}

	function focusNext(i, j) {
		if (j < wordLength - 1) {
			document.getElementById((i).toString().concat((j + 1).toString())).focus();
		}
		else {
			document.getElementById((i + 1).toString().concat((0).toString())).focus();
		}
		
	}

	function toggleFilter(row, column) {
		let backgroundColor = "";
		if (filters[row][column] == Filters.noFilter) {
			filters[row][column] = Filters.notInWord;
			backgroundColor = "lightgray";
		}
		else if (filters[row][column] == Filters.notInWord) {
			filters[row][column] = Filters.wrongPosition;
			backgroundColor = "orange";
		}
		else if (filters[row][column] == Filters.wrongPosition) {
			filters[row][column] = Filters.rightPosition;
			backgroundColor = "lightgreen";
		}
		else {
			filters[row][column] = Filters.noFilter
		}
		document.getElementById(row.toString().concat(column)).style.backgroundColor = backgroundColor;
	}

	$: {
		filteredWords = words.filter((w) => {
			for (let row = 0; row < nrOfRows; row++) {
				for (let column = 0; column < wordLength; column++) {
					if (letters[row][column] != "" && !filters[row][column](w, letters[row][column].toLocaleLowerCase(), column)) {
						return false;
					}
				}
			}
			return true;
		});	

	}

	$: {
		if (filteredWords.length > 0 && filteredWords.length <= 4) {
			displayedWords = [...ratedWords3(filteredWords, filteredWords).keys()].slice(0, 10)
			// displayedWords = [...ratedWords(filteredWords, rateAlphabet(filteredWords)).keys()].slice(0, 10)
			// displayedWords = words.sort();
		}
		else if (filteredWords.length > 4) {
			displayedWords = [...ratedWords3(words, filteredWords).keys()].slice(0, 10)
			// displayedWords = [...ratedWords(words, rateAlphabet(filteredWords)).keys()].slice(0, 10)
			// displayedWords = words.sort();
		}
	}

</script>

<main>
	{#each letters as row, i}
		<div class="row">
			{#each row as letter, j}
				<input 
					id="{i.toString().concat(j.toString())}" 
					maxlength="1" 
					class="letterbox" 
					bind:value="{letters[i][j]}" 
					on:click="{() => toggleFilter(i,j)}"
					on:input="{(e) => handleInput(e, i ,j)}">
			{/each}
		</div>
		<br>
	{/each}

	<!-- <button on:click="{() => console.log(rateAlphabet(filteredWords))}">rateAlphabet</button> -->

	{#if filteredWords && filteredWords.length > 0}
		<span>{filteredWords.length}</span><br>
		{#each displayedWords as word}
			<br>
			<div class="row">
			{#each word as letter}
				<div class="letterbox">{letter}</div>
			{/each}
			</div>
			
		{/each}
	{/if}
</main>

<style>
	main {
		margin: 0px auto;
		width: 320px;	
	}
	.row {
		display:inline-flex;
	}
	.letterbox {
		float:left;
		box-sizing: border-box;
		padding: 2px;
		margin: 0px 5px 5px 0px;
		border: 1px solid #ccc;
		border-radius: 3px;
		width: 60px;
		height: 60px;
		text-align: center;
		/* vertical-align:middle; */
		font-size: 36px;
	}

</style>