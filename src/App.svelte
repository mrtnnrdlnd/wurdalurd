<script lang="ts">
	import { Filters } from './Filters';
	import { onMount } from 'Svelte';
	let words: string[] = [];
	let filteredWords: string[];
	let displayedWords: string[];

	let wordLength = 5;
	let nrOfRows = 6;

	let letters: string[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(""));
	let filters: Function[][] = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(Filters.noFilter));;

   	onMount(async () => {
        const response = await fetch("/blob/main/public/words.json");
        words = await response.json() as string[];
		filteredWords = words;
	});

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
					if (letters[row][column] != "" && !filters[row][column](w, letters[row][column], column)) {
						return false;
					}
				}
			}
			return true;
		});	

	}

	$: {
		if (filteredWords.length > 0 && filteredWords.length <= 5) {
			displayedWords = [...ratedWords(filteredWords, rateAlphabet(filteredWords)).keys()].slice(0, 10)
		}
		else if (filteredWords.length > 5) {
			displayedWords = [...ratedWords(words, rateAlphabet(filteredWords)).keys()].slice(0, 10)
		}
	}

	// function findMostFilteringWord(fromWords: string[], inWords:string[]) {
	// 	let filterScore: number = fromWords.length;
	// 	let indexOfMostFilteringWord: number = 0;
	// 	let wordLength = fromWords[0].length;

	// 	fromWords.forEach((word, i) => {
	// 		let filteredInWordsSize = inWords.filter((w) => {
	// 			for (let column = 0; column < wordLength; column++) {
	// 				if (w.includes(word.charAt(column))) {
	// 					return false;
	// 				}
	// 			} 
	// 			return true
	// 		}).length;

	// 		if (filteredInWordsSize > 0 && filterScore > filteredInWordsSize) {
	// 			console.log(filteredInWordsSize)
	// 			filterScore = filteredInWordsSize;
	// 			indexOfMostFilteringWord = i;
	// 		}
	// 	})

	// 	return fromWords[indexOfMostFilteringWord];
	// }

	const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
	
	function rateAlphabet(words: string[]): Map<string, number[]> {
		// const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
		const wordLength = words[0].length;
		const totalNrOfWords = words.length;

		let ratedAlphabet: Map<string, number[]> = new Map();

		for (const letter of alphabet) {
			let rating: number[] = new Array(wordLength + 1);
			rating[wordLength] = words.filter((w) => w.includes(letter)).length;
			for (let i = 0; i < wordLength; i++) {
				rating[i] = Math.pow(words.filter((w) => Filters.rightPosition(w, letter, i)).length, 2);
				rating[i] += Math.pow(words.filter((w) => Filters.wrongPosition(w, letter, i)).length, 2);
				rating[i] += Math.pow(words.filter((w) => Filters.notInWord(w, letter, i)).length, 2);
				rating[i] /= totalNrOfWords;
			}

			ratedAlphabet.set(letter, rating);
		}

		return ratedAlphabet;
	}

	function ratedWords(words: string[], ratedAlphabet: Map<string, number[]>): Map<string, number> {
		let ratedWords: Map<string, number> = new Map();
		let sum: number;

		words.forEach((word) => {
			sum = 0;
			word.split("").forEach((letter, i) => {
				sum += ratedAlphabet.get(letter)[i];
				
				if (word.split(letter).length > 2) {
					sum += 5000;
				}
			})
			ratedWords.set(word, sum)
		})

		return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
	}

	function handleInput(e: Event, i, j) {
		let inputEvent = e as InputEvent;
		console.log(inputEvent.data)
		if (alphabet.includes(inputEvent.data)) {
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
		width: 50px;
		height: 50px;
		text-align: center;
		vertical-align:middle;
		font-size: 30px;
	}

</style>