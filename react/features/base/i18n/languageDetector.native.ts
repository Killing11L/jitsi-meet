import { I18nManager, NativeModules, Platform } from 'react-native';

import LANGUAGES_RESOURCES from '../../../../lang/languages.json';

const LANGUAGES = Object.keys(LANGUAGES_RESOURCES);

const DEFAULT_LANGUAGE = 'en';

function getSystemLocale() {
    if (Platform.OS === 'harmony') {
        try {
            const constants = I18nManager.getConstants();
            const id = constants?.localeIdentifier;

            if (typeof id === 'string' && id.length > 0) {
                return id;
            }
        } catch {
            // 忽略,走默认语言兜底。
        }

        return '';
    }

    const { LocaleDetector } = NativeModules;

    if (LocaleDetector && typeof LocaleDetector.locale === 'string'
        && LocaleDetector.locale.length > 0) {
        return LocaleDetector.locale;
    }

    return '';
}

/**
 * The singleton language detector for React Native which uses the system-wide
 * locale.
 */
export default {
    /**
     * Does not support caching.
     *
     * @returns {void}
     */
    cacheUserLanguage: Function.prototype,

    detect() {
        const rawLocale = getSystemLocale();

        if (!rawLocale) {
            return DEFAULT_LANGUAGE;
        }

        const parts = rawLocale.replace(/_/, '-').split('-');
        const [ lang, regionOrScript, region ] = parts;
        let locale;

        if (parts.length >= 3) {
            locale = `${lang}-${region}`;
        } else if (parts.length === 2) {
            locale = `${lang}-${regionOrScript}`;
        } else {
            locale = lang;
        }

        if (LANGUAGES.includes(locale)) {
            return locale;
        }

        return lang;
    },

    init: Function.prototype,

    type: 'languageDetector'
};
