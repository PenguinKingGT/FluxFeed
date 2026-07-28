import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import path from 'node:path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    default_locale: 'en',
    permissions: ['storage', 'contextMenus', 'activeTab', 'scripting', 'tabs', 'alarms'],
    host_permissions: ['*://*/*'],
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    action: {
      default_title: '__MSG_actionTitle__',
    },
    commands: {
    }
  },
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      manifest.action = {
        ...manifest.action,
        default_title: '__MSG_actionTitle__',
      };
      manifest.options_ui = {
        page: 'options.html',
        open_in_tab: true,
      };
    },
  },
  vite: () => ({
    plugins: [tailwindcss() as any],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  }),
});
