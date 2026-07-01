import { useState } from 'react';
import { ConfigProvider, Form, message, Typography } from 'antd';
import type { ControlPlugin } from '../registry/types';
import type { Alias, ControlNode, Questionnaire } from '../schema/types';
import { ControlField } from './ControlField';
import { PageNavigation } from './PageNavigation';
import { isVisible, useRuntime, validatePageExit } from './useRuntime';
import { clearRuntimeDraft } from '../io/persistence';

export interface QuestionnaireRendererProps {
  questionnaire: Questionnaire;
  plugins?: ControlPlugin[];
  onSubmit?: (answers: Record<Alias, unknown>) => void;
  persistDraft?: boolean;
}

export function QuestionnaireRenderer({ questionnaire, plugins = [], onSubmit, persistDraft = true }: QuestionnaireRendererProps) {
  const { store, registry } = useRuntime({ questionnaire, plugins, persistDraft });
  const state = store();
  const currentPage = questionnaire.pages.find((p) => p.id === state.currentPageId) ?? questionnaire.pages[0];
  const [api, ctx] = message.useMessage();
  const [pageError, setPageError] = useState<string | null>(null);

  if (!currentPage) return <Typography.Text>No pages.</Typography.Text>;

  const visiblePages = questionnaire.pages.filter((p) => isVisible(state, p.id));
  const idxInVisible = visiblePages.findIndex((p) => p.id === currentPage.id);
  const isLast = idxInVisible === visiblePages.length - 1;
  const canPrev = state.history.length > 0;

  const handleNext = () => {
    const err = validatePageExit(currentPage, state, registry);
    if (err) { setPageError(err); api.error(err); return; }
    setPageError(null);
    if (isLast) {
      onSubmit?.(state.answers);
      if (persistDraft) clearRuntimeDraft(questionnaire.id);
      return;
    }
    store.getState().pushHistory(currentPage.id);
    const override = store.getState().consumeNextOverride();
    let nextId: string | undefined = override ?? undefined;
    if (!nextId) {
      const futureVisible = visiblePages.slice(idxInVisible + 1);
      nextId = futureVisible[0]?.id;
    }
    if (nextId) store.getState().goToPage(nextId);
  };

  const handlePrev = () => {
    const prev = store.getState().popHistory();
    if (prev) store.getState().goToPage(prev);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: questionnaire.theme.accentColor, fontFamily: questionnaire.theme.fontFamily } }}>
      {ctx}
      <div style={{ maxWidth: questionnaire.theme.contentMaxWidth, margin: '0 auto', padding: 16 }}>
        <Typography.Title level={3}>{currentPage.name}</Typography.Title>
        <Form layout="vertical" onFinish={(e) => e?.preventDefault?.()} className="qnn-preview-form">
          {currentPage.rows.map((row) => (
            <div key={row.id} className="qnn-preview-row">
              {row.cols.map((c: ControlNode) => {
                if (!isVisible(state, c.alias)) return null;
                // Plugins can declare themselves invisible at runtime
                // (e.g. arithmetic with `visible: false`). The Renderer
                // still needs to mount inside ControlField so side
                // effects fire — but the surrounding row/grid frame
                // shouldn't take up layout space. We render a 0-span
                // wrapper instead of skipping entirely so the hook tree
                // stays stable across answer changes.
                const plugin = registry.get(c.type);
                const hidden = plugin?.isHidden ? plugin.isHidden(c as never) : false;
                if (hidden) {
                  return (
                    <div
                      key={c.id}
                      style={{ display: 'none' }}
                      aria-hidden="true"
                    >
                      <ControlField
                        node={c}
                        value={state.answers[c.alias]}
                        onChange={(v) => store.getState().setAnswer(c.alias, v)}
                        registry={registry}
                        answers={state.answers}
                        questionnaire={questionnaire}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={c.id}
                    className="qnn-preview-field"
                    style={{ gridColumn: `span ${c.layout.span}` }}
                  >
                    <ControlField
                      node={c}
                      value={state.answers[c.alias]}
                      onChange={(v) => store.getState().setAnswer(c.alias, v)}
                      {...(state.validationErrors[c.alias] ? { error: state.validationErrors[c.alias] } : {})}
                      registry={registry}
                      answers={state.answers}
                      questionnaire={questionnaire}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          <PageNavigation canPrev={canPrev} isLast={isLast} onPrev={handlePrev} onNext={handleNext} />
          {pageError && <div style={{ color: 'var(--ant-color-error, #f5222d)', marginTop: 8 }}>{pageError}</div>}
        </Form>
      </div>
    </ConfigProvider>
  );
}
