import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type {
  EstateRecommendation,
  RankedEstateItem,
} from '../../../application/recommendations/buildEstateRecommendations';
import { executeRecommendationAction } from '../../../application/recommendations/executeRecommendationAction';
import {
  findForensicsOffenderByEntityRef,
  type RankedOffender,
} from '../../../application/forensics/rankOffenders';
import { buildRefactorPlanForOffender } from '../../../application/forensics/buildRefactorPlan';
import { openRefactorOnCanvas } from '../../../application/forensics/openRefactorOnCanvas';
import { applyRefactorPlanAsDraft } from '../../../application/forensics/applyRefactorPlanAsDraft';
import { openSimulateFailureOnCanvas } from '../../../application/forensics/openSimulateFailureOnCanvas';
import { useBlueprintStore } from '../../../application/store/store';
import { buildTraceLensUrl } from '../forensics/traceLensUrl';
import { buildAdviceLensUrl } from '../forensics/adviceLensUrl';
import type { TraceLensPanelModel } from './useTraceLensPanelModel';

export function useTraceLensActions(model: TraceLensPanelModel) {
  const {
    loadedSystems,
    setLocation,
    scopeEntityRef,
    traceLensView,
    activePlan,
    setActivePlan,
    refactorPlanOptions,
  } = model;

  const {
    selectSystem,
    simulateResilienceFaultAtNode,
    selectNode,
    setShowCoupling,
    setGuidedRefactorEntityRefs,
    applyRefactorBoundaryAsDraft,
    setIsDiffOpen,
    setNotification,
    setResilienceSafeguard,
    setResilienceMode,
    setResiliencePanelTab,
  } = useBlueprintStore(
    useShallow(state => ({
      selectSystem: state.selectSystem,
      simulateResilienceFaultAtNode: state.simulateResilienceFaultAtNode,
      selectNode: state.selectNode,
      setShowCoupling: state.setShowCoupling,
      setGuidedRefactorEntityRefs: state.setGuidedRefactorEntityRefs,
      applyRefactorBoundaryAsDraft: state.applyRefactorBoundaryAsDraft,
      setIsDiffOpen: state.setIsDiffOpen,
      setNotification: state.setNotification,
      setResilienceSafeguard: state.setResilienceSafeguard,
      setResilienceMode: state.setResilienceMode,
      setResiliencePanelTab: state.setResiliencePanelTab,
    }))
  );

  const openOffender = useCallback(
    (offender: RankedOffender) => {
      const plan = buildRefactorPlanForOffender(offender, loadedSystems, refactorPlanOptions);
      if (!plan.boundary) return;
      setActivePlan({ offender, ...plan });
      const planScope = scopeEntityRef ?? offender.entityRef;
      const buildUrl = traceLensView === 'recommendations' ? buildAdviceLensUrl : buildTraceLensUrl;
      setLocation(
        buildUrl(planScope, {
          planEntityRef: offender.entityRef,
        }),
        {
          replace: true,
        }
      );
    },
    [loadedSystems, refactorPlanOptions, scopeEntityRef, setLocation, setActivePlan, traceLensView]
  );

  const openRecommendationFromEstate = useCallback(
    (recommendation: EstateRecommendation) => {
      const offender = findForensicsOffenderByEntityRef(
        loadedSystems,
        recommendation.targetEntityRef
      );
      if (!offender) return;
      openOffender(offender);
    },
    [loadedSystems, openOffender]
  );

  const openPlanOnCanvas = () => {
    if (!activePlan?.boundary) return;
    openRefactorOnCanvas(activePlan.boundary, activePlan.offender, {
      selectSystem,
      selectNode,
      setShowCoupling,
      setGuidedRefactorEntityRefs,
      setLocation,
      setTraceLensMode: useBlueprintStore.getState().setTraceLensMode,
    });
    setActivePlan(null);
  };

  const applyActivePlanAsDraft = () => {
    if (!activePlan?.boundary) return;
    void applyRefactorPlanAsDraft(activePlan.boundary, activePlan.offender, {
      selectSystem,
      applyRefactorBoundaryAsDraft,
      setLocation,
      setGuidedRefactorEntityRefs,
      setIsDiffOpen,
    }).then(result => {
      if (!result.ok) {
        setNotification({
          type: 'warning',
          title: 'Could not apply draft',
          message: result.reason,
        });
        return;
      }
      setNotification({
        type: 'success',
        title: 'Draft boundary added',
        message: 'A refactor group was added to the working copy. Review it in Pending Changes.',
      });
      setActivePlan(null);
    });
  };

  const simulateOffenderFailure = useCallback(
    (offender: RankedOffender) => {
      void openSimulateFailureOnCanvas(offender, {
        selectSystem,
        setLocation,
        simulateResilienceFaultAtNode,
      });
    },
    [selectSystem, setLocation, simulateResilienceFaultAtNode]
  );

  const openEstateItem = useCallback(
    (item: RankedEstateItem) => {
      if (item.offender) {
        openOffender(item.offender);
        return;
      }
      openRecommendationFromEstate(item.recommendation);
    },
    [openOffender, openRecommendationFromEstate]
  );

  const recommendationActionContext = useMemo(
    () => ({
      loadedSystems,
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
      setResilienceSafeguard,
      setResilienceMode,
      setResiliencePanelTab,
      openRefactorPlan: openOffender,
    }),
    [
      loadedSystems,
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
      setResilienceSafeguard,
      setResilienceMode,
      setResiliencePanelTab,
      openOffender,
    ]
  );

  const handleRecommendationAction = useCallback(
    async (action: EstateRecommendation['actions'][number]) => {
      const result = await executeRecommendationAction(action, recommendationActionContext);
      if (!result.ok) {
        setNotification({
          type: 'warning',
          title: 'Action unavailable',
          message: result.reason ?? 'Could not run this recommendation action.',
        });
      }
    },
    [recommendationActionContext, setNotification]
  );

  const simulateActivePlanFailure = useCallback(() => {
    if (!activePlan) return;
    void openSimulateFailureOnCanvas(activePlan.offender, {
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
    });
    setActivePlan(null);
  }, [activePlan, selectSystem, setLocation, simulateResilienceFaultAtNode, setActivePlan]);

  return {
    openRecommendationFromEstate,
    openPlanOnCanvas,
    applyActivePlanAsDraft,
    simulateOffenderFailure,
    openEstateItem,
    handleRecommendationAction,
    simulateActivePlanFailure,
  };
}
