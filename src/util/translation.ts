import { readFileSync } from "fs";
import { ErrorHandler } from "./errorhandler";
import { join } from "path";

export class Translation {
    public static getInstance(): Translation {
        if (!Translation.instance) {
            Translation.instance = new Translation();
        }

        return Translation.instance;
    }

    public static do(id: string, ...args: any[]): string {
        const instance = Translation.getInstance();
        const translation = instance.getId(id);

        if (translation) {
            return translation.replace(/\{(\d+)\}/g, (match, found) => {
                if (typeof args[found] === "undefined") {
                    return found;
                } else {
                    return args[found];
                }
            });
        } else {
            return id;
        }
    }

    private static readonly FALLBACK_LOCALE = "en";

    private static instance: Translation;
    private locale: string;
    private translations: { [key: string]: string } = {};

    private constructor() {
        this.findLocale();
        this.loadLocale();
    }

    private findLocale(): void {
        const nlsConfig = process.env.VSCODE_NLS_CONFIG;

        try {
            const { locale } = JSON.parse(nlsConfig);
            this.setLocale(locale);
        } catch (e) {
            this.setLocale(Translation.FALLBACK_LOCALE);
        }
    }

    private setLocale(locale: string): void {
        this.locale = locale.toLowerCase();
    }

    private loadLocale(): void {
        const localeFile = this.loadLocaleFile();
        try {
            this.translations = JSON.parse(localeFile);
        } catch (e) {
            ErrorHandler.logCritical(e, "Invalid locale file");
            this.translations = {};
        }
    }

    private loadLocaleFile(): string {
        try {
            return readFileSync(
                join(
                    __dirname,
                    `../../../i18n/${ this.locale }.json`,
                ),
            ).toString();
        } catch (e) {
            try {
                return readFileSync(
                    join(
                        __dirname,
                        `../../../i18n/${ Translation.FALLBACK_LOCALE }.json`,
                    ),
                ).toString();
            } catch (er) {
                return `{}`;
            }
        }
    }

    private getId(id: string): string {
        return this.translations[id];
    }
}
