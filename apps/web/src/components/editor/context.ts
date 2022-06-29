import { useCallback } from "react";
import { IEditor } from "./types";
import createStore from "../../common/store";
import BaseStore from "../../stores";
import { UseStore } from "zustand";
import shallow from "zustand/shallow";
import { ToolbarDefinition } from "notesnook-editor/dist/toolbar/types";

type EditorSubState = {
  editor?: IEditor;
  canUndo?: boolean;
  canRedo?: boolean;
  searching?: boolean;
  toolbarConfig?: ToolbarDefinition;
};
class EditorContext extends BaseStore {
  subState: EditorSubState = {};

  configure = (partial: Partial<EditorSubState>) => {
    this.set((state: EditorContext) => {
      state.subState = { ...state.subState, ...partial };
    });
  };
}

const [useEditorContext] = createStore(EditorContext) as [
  UseStore<EditorContext>,
  EditorContext
];

export function useEditorInstance() {
  return useEditorContext((store) => store.subState.editor);
}

export function useConfigureEditor() {
  return useEditorContext((store) => store.configure);
}

export function useHistory() {
  return useEditorContext(
    (store) =>
      ({
        canUndo: store.subState.canUndo,
        canRedo: store.subState.canRedo,
        undo: store.subState.editor?.undo,
        redo: store.subState.editor?.redo,
      } as const),
    shallow
  );
}

export function useSearch() {
  const isSearching = useEditorContext((store) => store.subState.searching);
  const configure = useEditorContext((store) => store.configure);
  const toggleSearch = useCallback(
    () => configure({ searching: !isSearching }),
    [isSearching, configure]
  );
  return { isSearching, toggleSearch };
}

export function useToolbarConfig() {
  const toolbarConfig = useEditorContext(
    (store) => store.subState.toolbarConfig
  );
  const configure = useEditorContext((store) => store.configure);
  const setToolbarConfig = useCallback(
    (config: ToolbarDefinition) => configure({ toolbarConfig: config }),
    [configure]
  );
  return { toolbarConfig, setToolbarConfig };
}
