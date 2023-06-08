import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import prisma from '@db';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import sanitize from 'sanitize-html';

/** @type {PageServerLoad} */
export async function load({ params }) {
	const { key } = params;

	let data = await prisma.paste.findUnique({
		where: { key }
	});

	if (!data) throw error(404, 'Not found');

	data = await prisma.paste.update({
		where: { key },
		data: { readCount: { increment: 1 } }
	});

	let { content, language, encrypted, passwordProtected, expiresCount, readCount } = data;
	if (expiresCount !== null && expiresCount < readCount) {
		await prisma.paste.delete({ where: { key } });
		throw error(404, 'Not found');
	}

	let contentHtml: string;

	try {
		if (!encrypted && language !== 'plaintext') {
			loadLanguages([language]);
			contentHtml = Prism.highlight(content, Prism.languages[language], language);
		} else {
			contentHtml = sanitize(content, { disallowedTagsMode: 'escape' });
		}
	} catch (e) {
		console.error(e);
		contentHtml = sanitize(content, { disallowedTagsMode: 'escape' });
	}

	return {
		content,
		contentHtml,
		encrypted,
		language,
		passwordProtected
	};
}
