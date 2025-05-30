import './conversation-authors.css';

import {CachedFunction} from 'webext-storage-cache';
import {$$} from 'select-dom';
import * as pageDetect from 'github-url-detection';

import features from '../feature-manager.js';
import fetchDom from '../helpers/fetch-dom.js';
import {buildRepoURL, cacheByRepo, getUsername} from '../github-helpers/index.js';
import observe from '../helpers/selector-observer.js';

const collaborators = new CachedFunction('repo-collaborators', {
	async updater(): Promise<string[]> {
		const dom = await fetchDom(buildRepoURL('issues/show_menu_content?partial=issues/filters/authors_content'));
		return $$('.SelectMenu-item img[alt]', dom)
			.map(avatar => avatar.alt.slice(1));
	},
	maxAge: {days: 1},
	staleWhileRevalidate: {days: 20},
	cacheKey: cacheByRepo,
});

async function highlightCollaborators(signal: AbortSignal): Promise<void> {
	const list = await collaborators.get();
	observe([
		// Old issue lists - TODO: Drop after June 2025
		'.js-issue-row [data-hovercard-type="user"]',
		'a[class^="issue-item-module__authorCreatedLink"]',
	], author => {
		if (list.includes(author.textContent.trim())) {
			author.classList.add('rgh-collaborator');
		}
	}, {signal});
}

function highlightSelf(signal: AbortSignal): void {
	// "Opened by {user}" and "Created by {user}"
	observe(`.opened-by a[title$="ed by ${CSS.escape(getUsername()!)}"]`, author => {
		author.classList.add('rgh-collaborator');
		author.style.fontStyle = 'italic';
	}, {signal});
}

void features.add(import.meta.url, {
	include: [
		pageDetect.isRepoIssueOrPRList,
	],
	init: highlightCollaborators,
}, {
	include: [
		pageDetect.isIssueOrPRList,
	],
	init: highlightSelf,
});

/*

Test URLs:

https://github.com/issues
https://github.com/refined-github/refined-github/pulls

*/
