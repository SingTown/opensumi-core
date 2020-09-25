import { KeymapService, ContextKeyExprType } from '@ali/ide-keymaps/lib/browser/keymaps.service';
import { MockInjector } from '../../../../tools/dev-tool/src/mock-injector';
import { createBrowserInjector } from '../../../../tools/dev-tool/src/injector-helper';
import { KeymapsParser } from '@ali/ide-keymaps/lib/browser/keymaps-parser';
import { ResourceProvider, KeybindingRegistry, KeybindingService, URI, EDITOR_COMMANDS, Disposable, KeybindingScope, localize } from '@ali/ide-core-browser';
import { KEYMAPS_FILE_NAME } from '@ali/ide-keymaps';
import { USER_STORAGE_SCHEME } from '@ali/ide-preferences';
import { KeymapsModule } from '@ali/ide-keymaps/lib/browser';

describe('KeymapsService should be work', () => {
  let keymapsService: KeymapService;
  let injector: MockInjector;
  const keybindingContent = JSON.stringify([{
    when: 'editorFocus && textInputFocus && !editorReadonly',
    command: 'monaco.editor.action.deleteLines',
    keybinding: '⌘+⇧+L',
  }]);

  const mockKeymapsParser = {
    parse: jest.fn(() => JSON.parse(keybindingContent)),
  };

  const mockResource = {
    readContents: jest.fn(() => keybindingContent),
    saveContents: jest.fn(),
    whenReady: Promise.resolve(),
  };
  const mockKeybindingService = {
    convert: jest.fn(),
    clearConvert: jest.fn(),
  };
  const resourceProvider = jest.fn(() => mockResource);
  const mockKeybindingRegistry = {
    getKeybindingsForCommand: jest.fn(() => {
      return [{
        command: 'test.command',
        keybindings: 'cmd+c',
      }];
    }),
    unregisterKeybinding: jest.fn(),
    registerKeybinding: jest.fn(() => Disposable.create(() => {})),
    acceleratorFor: jest.fn(() => (['CMD+C'])),
    validateKeybindingInScope: jest.fn(() => true),
  };
  let onKeybindingsChanged;
  beforeAll(() => {
    injector = createBrowserInjector([
      KeymapsModule,
    ]);

    // mock used instance
    injector.overrideProviders(
      {
        token: KeymapsParser,
        useValue: mockKeymapsParser,
      },
      {
        token: ResourceProvider,
        useValue: {},
      },
      {
        token: KeybindingService,
        useValue: mockKeybindingService,
      },
      {
        token: KeybindingRegistry,
        useValue: mockKeybindingRegistry,
      },
    );

    injector.overrideProviders({
      token: ResourceProvider,
      useValue: resourceProvider,
    });
    onKeybindingsChanged = jest.fn();
    injector.mock(KeybindingRegistry, 'onKeybindingsChanged', onKeybindingsChanged);

    keymapsService = injector.get(KeymapService);

    keymapsService.init();

  });

  describe('01 #Init', () => {
    it('should ready to work after init', async (done) => {

      expect(resourceProvider).toBeCalledWith(new URI().withScheme(USER_STORAGE_SCHEME).withPath(KEYMAPS_FILE_NAME));

      expect(typeof keymapsService.init).toBe('function');
      expect(typeof keymapsService.dispose).toBe('function');
      expect(typeof keymapsService.reconcile).toBe('function');
      expect(typeof keymapsService.setKeybinding).toBe('function');
      expect(typeof keymapsService.covert).toBe('function');
      expect(typeof keymapsService.resetKeybinding).toBe('function');
      expect(typeof keymapsService.getKeybindings).toBe('function');
      expect(typeof keymapsService.open).toBe('function');
      expect(typeof keymapsService.getWhen).toBe('function');
      expect(typeof keymapsService.getScope).toBe('function');
      expect(typeof keymapsService.getKeybindingItems).toBe('function');
      expect(typeof keymapsService.searchKeybindings).toBe('function');
      expect(typeof keymapsService.validateKeybinding).toBe('function');
      expect(typeof keymapsService.getRaw).toBe('function');
      done();
    });
  });

  describe('02 #API should be work', () => {

    it('open method should be work', async (done) => {
      const open = jest.fn();
      injector.mockCommand(EDITOR_COMMANDS.OPEN_RESOURCE.id, open);
      await keymapsService.open();
      expect(open).toBeCalledTimes(1);
      done();
    });

    it('fix method should be work', async (done) => {
      const open = jest.fn();
      injector.mockCommand(EDITOR_COMMANDS.OPEN_RESOURCE.id, open);
      await keymapsService.fixed();
      expect(open).toBeCalledTimes(1);
      done();
    });

    it('covert method should be work', async (done) => {
      await keymapsService.covert({} as any);
      expect(mockKeybindingService.convert).toBeCalledTimes(1);
      done();
    });

    it('clearConvert method should be work', async (done) => {
      await keymapsService.clearCovert();
      expect(mockKeybindingService.clearConvert).toBeCalledTimes(1);
      done();
    });

    it('reconcile method should be work', async (done) => {
      const keybindings = [{
        command: 'test.command',
        keybinding: 'cmd+c',
      }];
      keymapsService.reconcile(keybindings);
      expect(mockKeybindingRegistry.getKeybindingsForCommand).toBeCalledTimes(3);
      expect(mockKeybindingRegistry.unregisterKeybinding).toBeCalledTimes(2);
      expect(mockKeybindingRegistry.registerKeybinding).toBeCalledTimes(3);
      done();
    });

    it('setKeybinding method should be work', async (done) => {
      const keybinding = {
        command: 'test.command',
        keybinding: 'cmd+c',
      };
      keymapsService.setKeybinding(keybinding);
      expect(mockKeybindingRegistry.registerKeybinding).toBeCalledTimes(4);
      done();
    });

    it('getKeybindings method should be work', (done) => {
      keymapsService.getKeybindings();
      done();
    });

    it('resetKeybinding method should be work', async (done) => {
      const keybinding = {
        command: 'test.command',
        keybinding: 'cmd+c',
      };
      await keymapsService.resetKeybinding(keybinding);
      expect(mockKeybindingRegistry.registerKeybinding).toBeCalledTimes(5);
      expect(mockResource.saveContents).toBeCalledTimes(2);
      done();
    });

    it('getWhen method should be work', () => {
      let keybinding = {
        command: 'test.command',
        keybinding: 'cmd+c',
        when: 'focus' as any,
      };
      let result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(keybinding.when);

      const defined = {
        getType: () => ContextKeyExprType.Defined,
        key: 'definedKey',
      };
      keybinding = {
        ...keybinding,
        when: defined,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(defined.key);

      const equals = {
        getType: () => ContextKeyExprType.Equals,
        getValue: () => 'true',
        key: 'notEqualsKey',
      };
      keybinding = {
        ...keybinding,
        when: equals,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`${equals.key} == 'true'`);

      const notEquals = {
        getType: () => ContextKeyExprType.NotEquals,
        getValue: () => 'true',
        key: 'equalsKey',
      };
      keybinding = {
        ...keybinding,
        when: notEquals,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`${notEquals.key} != 'true'`);

      const not = {
        getType: () => ContextKeyExprType.Not,
        key: 'notKey',
      };
      keybinding = {
        ...keybinding,
        when: not,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`!${not.key}`);

      const regex = {
        getType: () => ContextKeyExprType.Regex,
        regexp: {
          source: 'regexKey',
          ignoreCase: true,
        },
        key: 'regexKey',
      };
      keybinding = {
        ...keybinding,
        when: regex,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`${regex.key} =~ /${regex.regexp.source}/${regex.regexp.ignoreCase ? 'i' : ''}`);

      const and = {
        getType: () => ContextKeyExprType.And,
        expr: [{
          serialize: () => 'a',
        }, {
          serialize: () => 'b',
        }],
      };
      keybinding = {
        ...keybinding,
        when: and,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`a && b`);

      const or = {
        getType: () => ContextKeyExprType.Or,
        expr: [{
          serialize: () => 'a',
        }, {
          serialize: () => 'b',
        }],
      };
      keybinding = {
        ...keybinding,
        when: or,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`a || b`);

      const expr = {
        getType: () => ContextKeyExprType.Or,
        expr: [and],
      };
      keybinding = {
        ...keybinding,
        when: expr,
      };
      result =  keymapsService.getWhen(keybinding);
      expect(result).toBe(`a && b`);
    });

    it('getScope method should be work', () => {
      expect(keymapsService.getScope(KeybindingScope.DEFAULT)).toBe(localize('keymaps.source.default'));
      expect(keymapsService.getScope(KeybindingScope.USER)).toBe(localize('keymaps.source.user'));
      expect(keymapsService.getScope(KeybindingScope.WORKSPACE)).toBe(localize('keymaps.source.workspace'));
    });

    it('getKeybindingItems method should be work', () => {
      const items = keymapsService.getKeybindingItems();
      expect(items.length).toBe(1);
    });

    it('validateKeybinding method should be work', () => {
      const items = keymapsService.getKeybindingItems();
      keymapsService.validateKeybinding(items[0], 'cmd+c');
      expect(mockKeybindingRegistry.validateKeybindingInScope).toBeCalledTimes(1);
    });

    it('detectKeybindings method should be work', () => {
      const items = keymapsService.getKeybindingItems();
      const detectKeybindings = keymapsService.detectKeybindings({
        ...items[0],
        keybinding: 'CMD+D',
      }, 'CMD+C');
      expect(detectKeybindings.length).toBe(1);
    });
  });
});
