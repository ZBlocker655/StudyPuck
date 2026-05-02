import { fail, redirect } from '@sveltejs/kit';
import { addStudyLanguage, getDb, getActiveUserLanguages, updateStudyLanguage } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  cardEntryExampleSentenceFormatSchema,
  getCardEntryExampleSentenceFormatLabel,
  updateStudyLanguageCardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';
import { getLanguageByCode } from '$lib/config/languages.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
  addLanguage: async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
      throw redirect(303, '/');
    }

    const formData = await event.request.formData();
    const selectedLanguageCode = formData.get('languageId')?.toString();
    const selectedLanguage = getLanguageByCode(selectedLanguageCode);

    if (!selectedLanguage) {
      return fail(400, {
        addLanguageError: 'Choose a language before continuing.',
        selectedLanguageCode: selectedLanguageCode ?? '',
      });
    }

    const database = getDb(env.DATABASE_URL);
    const existingLanguages = await getActiveUserLanguages(session.user.id, database as never);

    if (existingLanguages.some((language) => language.languageId === selectedLanguage.code)) {
      return fail(400, {
        addLanguageError: `${selectedLanguage.label} is already part of your study setup.`,
        selectedLanguageCode: selectedLanguage.code,
      });
    }

    await addStudyLanguage(
      {
        userId: session.user.id,
        languageId: selectedLanguage.code,
        languageName: selectedLanguage.label,
      },
      database as never
    );

    throw redirect(303, `/${selectedLanguage.code}/`);
  },

  saveExampleSentenceFormat: async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
      throw redirect(303, '/');
    }

    const formData = await event.request.formData();
    const languageId = formData.get('languageId')?.toString().trim() ?? '';
    const submittedExampleSentenceFormat = formData.get('exampleSentenceFormat')?.toString().trim() ?? '';
    const parsedExampleSentenceFormat = cardEntryExampleSentenceFormatSchema.safeParse(submittedExampleSentenceFormat);

    if (!parsedExampleSentenceFormat.success) {
      return fail(400, {
        exampleSentenceFormatLanguageId: languageId,
        submittedExampleSentenceFormat,
        exampleSentenceFormatError: 'Choose a valid example sentence format before saving.',
      });
    }

    const database = getDb(env.DATABASE_URL);
    const activeLanguages = await getActiveUserLanguages(session.user.id, database as never);
    const targetLanguage = activeLanguages.find((language) => language.languageId === languageId);

    if (!targetLanguage) {
      return fail(404, {
        exampleSentenceFormatLanguageId: languageId,
        submittedExampleSentenceFormat: parsedExampleSentenceFormat.data,
        exampleSentenceFormatError: 'That language is no longer available in your study setup.',
      });
    }

    await updateStudyLanguage(
      session.user.id,
      targetLanguage.languageId,
      {
        settings: updateStudyLanguageCardEntryExampleSentenceFormat(
          targetLanguage.settings,
          parsedExampleSentenceFormat.data
        ),
      },
      database as never
    );

    return {
      exampleSentenceFormatLanguageId: targetLanguage.languageId,
      savedExampleSentenceFormat: parsedExampleSentenceFormat.data,
      exampleSentenceFormatSuccess: `${targetLanguage.languageName} Card Entry examples will now use ${getCardEntryExampleSentenceFormatLabel(parsedExampleSentenceFormat.data).toLowerCase()}.`,
    };
  },
};
