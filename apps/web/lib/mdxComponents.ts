import type * as React from "react"
import { Image } from "@/components/chapter/MdxImage"

// === Active components (used in current chapters) ===
import { EnterpriseBaselineViz } from "@/components/visualisations/EnterpriseBaselineViz"
import { TrainingParallelismViz } from "@/components/visualisations/TrainingParallelismViz"
import { NVLinkViz } from "@/components/visualisations/NVLinkViz"
import { PacketDropCostViz } from "@/components/visualisations/PacketDropCostViz"
import { IndustryEvolutionViz } from "@/components/visualisations/IndustryEvolutionViz"
import { NICEvolutionViz } from "@/components/visualisations/NICEvolutionViz"
import { DPUExplainerViz } from "@/components/visualisations/DPUExplainerViz"
import { DGXAnatomyViz } from "@/components/visualisations/DGXAnatomyViz"
import { FullWiringViz } from "@/components/visualisations/FullWiringViz"
import { RailTopologyViz } from "@/components/visualisations/RailTopologyViz"
import { ECMPViz } from "@/components/visualisations/ECMPViz"
import { SoftwareStackViz } from "@/components/visualisations/SoftwareStackViz"
import { ManagementPhilosophyViz } from "@/components/visualisations/ManagementPhilosophyViz"
import { OperationsModeViz } from "@/components/visualisations/OperationsModeViz"
import { PlatformLandscapeViz } from "@/components/visualisations/PlatformLandscapeViz"
import { PowerOnSequenceViz } from "@/components/visualisations/PowerOnSequenceViz"
import { FirstAccessViz } from "@/components/visualisations/FirstAccessViz"
import { ConnectivityMapViz } from "@/components/visualisations/ConnectivityMapViz"
// === Ch2 — Why HPC Networking Is Different ===
import { AllReduceBarrierViz } from "@/components/visualisations/AllReduceBarrierViz"
import { TailLatencyViz } from "@/components/visualisations/TailLatencyViz"
import { InvestigationMindsetViz } from "@/components/visualisations/InvestigationMindsetViz"
import { CommandDeviceMapViz } from "@/components/visualisations/CommandDeviceMapViz"
import { LinkBothEndsViz } from "@/components/visualisations/LinkBothEndsViz"
import { IbstatOutputViz } from "@/components/visualisations/IbstatOutputViz"
import { CounterBothEndsViz } from "@/components/visualisations/CounterBothEndsViz"
import { InterfaceCountersViz } from "@/components/visualisations/InterfaceCountersViz"
import { EthtoolOutputViz } from "@/components/visualisations/EthtoolOutputViz"
import { PFCCommandViz } from "@/components/visualisations/PFCCommandViz"
import { ShowTopologyViz } from "@/components/visualisations/ShowTopologyViz"
import { DiagnosticWorkflowViz } from "@/components/visualisations/DiagnosticWorkflowViz"
import { ScenarioCommandMapViz } from "@/components/visualisations/ScenarioCommandMapViz"
import { SimulatorExplainerViz } from "@/components/visualisations/SimulatorExplainerViz"
import { IBvEthernetMindsetViz } from "@/components/visualisations/IBvEthernetMindsetViz"
import { ONYXNavigationViz } from "@/components/visualisations/ONYXNavigationViz"
import { IBPortStatusViz } from "@/components/visualisations/IBPortStatusViz"
import { IBCountersViz } from "@/components/visualisations/IBCountersViz"
import { CounterRootCauseViz } from "@/components/visualisations/CounterRootCauseViz"
import { SubnetManagerViz } from "@/components/visualisations/SubnetManagerViz"
import { RoutingAlgorithmViz } from "@/components/visualisations/RoutingAlgorithmViz"
import { IBDiagnetOutputViz } from "@/components/visualisations/IBDiagnetOutputViz"
import { UFMEventLogViz } from "@/components/visualisations/UFMEventLogViz"
import { IBDiagnosticWorkflowViz } from "@/components/visualisations/IBDiagnosticWorkflowViz"
import { ConnectX7ModesViz } from "@/components/visualisations/ConnectX7ModesViz"
import { IBvsRoCEInfraViz } from "@/components/visualisations/IBvsRoCEInfraViz"
import { LoadBalancingTaxonomyViz } from "@/components/visualisations/LoadBalancingTaxonomyViz"
import { IncastCongestionViz } from "@/components/visualisations/IncastCongestionViz"
import { LowEntropyFlowletsViz } from "@/components/visualisations/LowEntropyFlowletsViz"
import { TopologyScalingViz } from "@/components/visualisations/TopologyScalingViz"
import { FatTreeViz } from "@/components/visualisations/FatTreeViz"
import { BasePodSuperPodViz } from "@/components/visualisations/BasePodSuperPodViz"
import { OversubscriptionCalculatorViz } from "@/components/visualisations/OversubscriptionCalculatorViz"
import { RODvsRUDViz } from "@/components/visualisations/RODvsRUDViz"
import { SwitchBufferViz } from "@/components/visualisations/SwitchBufferViz"
import { TopologySizingWorkflowViz } from "@/components/visualisations/TopologySizingWorkflowViz"
import { CongestionMechanicsViz } from "@/components/visualisations/CongestionMechanicsViz"
import { PFCMechanicsViz } from "@/components/visualisations/PFCMechanicsViz"
import { PauseStormViz } from "@/components/visualisations/PauseStormViz"
import { ECNMechanicsViz } from "@/components/visualisations/ECNMechanicsViz"
import { DCQCNViz } from "@/components/visualisations/DCQCNViz"
import { CongestionTimelineViz } from "@/components/visualisations/CongestionTimelineViz"
import { ProactiveReactiveViz } from "@/components/visualisations/ProactiveReactiveViz"
import { RoCEv2ConfigChecklist } from "@/components/visualisations/RoCEv2ConfigChecklist"
import { NCCLLayerViz } from "@/components/visualisations/NCCLLayerViz"
import { NCCLAlgorithmViz } from "@/components/visualisations/NCCLAlgorithmViz"
import { NCCLEnvVarViz } from "@/components/visualisations/NCCLEnvVarViz"
import { NCCLTestOutputViz } from "@/components/visualisations/NCCLTestOutputViz"
import { NCCLCorrelationViz } from "@/components/visualisations/NCCLCorrelationViz"
import { DCQCNTuningViz } from "@/components/visualisations/DCQCNTuningViz"

// === Ch9 — Optics, Cabling, and the Physical Layer ===
import { OpticsRoadmapViz } from "@/components/visualisations/OpticsRoadmapViz"
import { SignalChainViz } from "@/components/visualisations/SignalChainViz"
import { FiberTypesViz } from "@/components/visualisations/FiberTypesViz"
import { FormFactorViz } from "@/components/visualisations/FormFactorViz"
import { CableSelectionViz } from "@/components/visualisations/CableSelectionViz"
import { CPOEvolutionViz } from "@/components/visualisations/CPOEvolutionViz"

// === Ch10 — The Storage Fabric ===
import { StorageSeparationViz } from "@/components/visualisations/StorageSeparationViz"
import { StorageDataPathViz } from "@/components/visualisations/StorageDataPathViz"
import { NVMeoFProtocolViz } from "@/components/visualisations/NVMeoFProtocolViz"
import { ParallelFSViz } from "@/components/visualisations/ParallelFSViz"
import { CheckpointCostViz } from "@/components/visualisations/CheckpointCostViz"
import { StorageTopologyViz } from "@/components/visualisations/StorageTopologyViz"

// === Ch11 — Monitoring, Telemetry, and Observability ===
import { UFMApiViz } from "@/components/visualisations/UFMApiViz"
import { DCGMMetricsViz } from "@/components/visualisations/DCGMMetricsViz"
import { AlertThresholdViz } from "@/components/visualisations/AlertThresholdViz"
import { CorrelationTimelineViz } from "@/components/visualisations/CorrelationTimelineViz"
import { FabricHealthDashboardViz } from "@/components/visualisations/FabricHealthDashboardViz"

// === Ch12 — Scale-Up Networking: NVLink Switch System ===
import { NVLinkScaleViz } from "@/components/visualisations/NVLinkScaleViz"
import { ScaleUpTopologyViz } from "@/components/visualisations/ScaleUpTopologyViz"
import { BandwidthComparisonViz } from "@/components/visualisations/BandwidthComparisonViz"
import { ScaleDecisionViz } from "@/components/visualisations/ScaleDecisionViz"
import { NVLinkDiagnosticsViz } from "@/components/visualisations/NVLinkDiagnosticsViz"

// === Ch13 — Alternative Topologies ===
import { TorusEvolutionViz } from "@/components/visualisations/TorusEvolutionViz"
import { AllReduceOnTorusViz } from "@/components/visualisations/AllReduceOnTorusViz"
import { DragonFlyTopologyViz } from "@/components/visualisations/DragonFlyTopologyViz"
import { TPUPodViz } from "@/components/visualisations/TPUPodViz"
import { TopologyDecisionViz } from "@/components/visualisations/TopologyDecisionViz"

// === Ch14 — GPU Hardware Generations and Network Implications ===
import { NVLinkGenerationViz } from "@/components/visualisations/NVLinkGenerationViz"
import { GPUFormFactorViz } from "@/components/visualisations/GPUFormFactorViz"
import { PCIeBandwidthViz } from "@/components/visualisations/PCIeBandwidthViz"
import { GH200ArchViz } from "@/components/visualisations/GH200ArchViz"
import { MIGNetworkViz } from "@/components/visualisations/MIGNetworkViz"

// === Ch15 — IP Routing for AI/ML Fabrics ===
import { RoutingProtocolCompareViz } from "@/components/visualisations/RoutingProtocolCompareViz"
import { BGPUnnumberedViz } from "@/components/visualisations/BGPUnnumberedViz"
import { BGPASNDesignViz } from "@/components/visualisations/BGPASNDesignViz"
import { BGPDPFViz } from "@/components/visualisations/BGPDPFViz"
import { RIFTvsBGPViz } from "@/components/visualisations/RIFTvsBGPViz"
import { FlexAlgoViz } from "@/components/visualisations/FlexAlgoViz"
import { SRv6PathViz } from "@/components/visualisations/SRv6PathViz"
import { MultiTenancyFabricViz } from "@/components/visualisations/MultiTenancyFabricViz"

// === Ch16 — The GPU Compute Network: Packet Anatomy End to End ===
import { WiresharkCaptureViz } from "@/components/visualisations/WiresharkCaptureViz"
import { DGXNetworkInterfacesViz } from "@/components/visualisations/DGXNetworkInterfacesViz"
import { QueuePairMechanicsViz } from "@/components/visualisations/QueuePairMechanicsViz"
import { ConnectX7PipelineViz } from "@/components/visualisations/ConnectX7PipelineViz"
import {
  LeafSwitchProcessingViz,
  SpineForwardingViz,
  DestinationNICDeliveryViz,
  IBvsRoCEPacketViz,
} from "@/components/visualisations/LeafSpineNICVizzes"
import {
  AlternativeNICStackViz,
  FabricComparisonMatrixViz,
  ProductionDebugMapViz,
} from "@/components/visualisations/AlternativeComparisons"

// === Legacy components (no longer in active chapters, kept for reference) ===
// ServerRackViz, NICCardViz, DGXNodeViz, HardwareComparison
// These files remain in components/visualisations/ but are not registered

export const mdxComponents: Record<string, React.ComponentType<any>> = {
  Image: Image as unknown as React.ComponentType<any>,
  EnterpriseBaselineViz,
  TrainingParallelismViz,
  NVLinkViz,
  PacketDropCostViz,
  IndustryEvolutionViz,
  NICEvolutionViz,
  DPUExplainerViz,
  DGXAnatomyViz,
  FullWiringViz,
  RailTopologyViz,
  ECMPViz,
  SoftwareStackViz,
  ManagementPhilosophyViz,
  OperationsModeViz,
  PlatformLandscapeViz,
  PowerOnSequenceViz,
  FirstAccessViz,
  ConnectivityMapViz,
  AllReduceBarrierViz,
  TailLatencyViz,
  InvestigationMindsetViz,
  CommandDeviceMapViz,
  LinkBothEndsViz,
  IbstatOutputViz,
  CounterBothEndsViz,
  InterfaceCountersViz,
  EthtoolOutputViz,
  PFCCommandViz,
  ShowTopologyViz,
  DiagnosticWorkflowViz,
  ScenarioCommandMapViz,
  SimulatorExplainerViz,
  IBvEthernetMindsetViz,
  ONYXNavigationViz,
  IBPortStatusViz,
  IBCountersViz,
  CounterRootCauseViz,
  SubnetManagerViz,
  RoutingAlgorithmViz,
  IBDiagnetOutputViz,
  UFMEventLogViz,
  IBDiagnosticWorkflowViz,
  ConnectX7ModesViz,
  IBvsRoCEInfraViz,
  LoadBalancingTaxonomyViz,
  IncastCongestionViz,
  LowEntropyFlowletsViz,
  TopologyScalingViz,
  FatTreeViz,
  BasePodSuperPodViz,
  OversubscriptionCalculatorViz,
  RODvsRUDViz,
  SwitchBufferViz,
  TopologySizingWorkflowViz,
  CongestionMechanicsViz,
  PFCMechanicsViz,
  PauseStormViz,
  ECNMechanicsViz,
  DCQCNViz,
  CongestionTimelineViz,
  ProactiveReactiveViz,
  RoCEv2ConfigChecklist,
  NCCLLayerViz,
  NCCLAlgorithmViz,
  NCCLEnvVarViz,
  NCCLTestOutputViz,
  NCCLCorrelationViz,
  DCQCNTuningViz,
  // Ch9
  OpticsRoadmapViz,
  SignalChainViz,
  FiberTypesViz,
  FormFactorViz,
  CableSelectionViz,
  CPOEvolutionViz,
  // Ch10
  StorageSeparationViz,
  StorageDataPathViz,
  NVMeoFProtocolViz,
  ParallelFSViz,
  CheckpointCostViz,
  StorageTopologyViz,
  UFMApiViz,
  DCGMMetricsViz,
  AlertThresholdViz,
  CorrelationTimelineViz,
  FabricHealthDashboardViz,
  NVLinkScaleViz,
  ScaleUpTopologyViz,
  BandwidthComparisonViz,
  ScaleDecisionViz,
  NVLinkDiagnosticsViz,
  TorusEvolutionViz,
  AllReduceOnTorusViz,
  DragonFlyTopologyViz,
  TPUPodViz,
  TopologyDecisionViz,
  // Ch14
  NVLinkGenerationViz,
  GPUFormFactorViz,
  PCIeBandwidthViz,
  GH200ArchViz,
  MIGNetworkViz,
  RoutingProtocolCompareViz,
  BGPUnnumberedViz,
  BGPASNDesignViz,
  BGPDPFViz,
  RIFTvsBGPViz,
  FlexAlgoViz,
  SRv6PathViz,
  MultiTenancyFabricViz,
  WiresharkCaptureViz,
  DGXNetworkInterfacesViz,
  QueuePairMechanicsViz,
  ConnectX7PipelineViz,
  LeafSwitchProcessingViz,
  SpineForwardingViz,
  DestinationNICDeliveryViz,
  IBvsRoCEPacketViz,
  AlternativeNICStackViz,
  FabricComparisonMatrixViz,
  ProductionDebugMapViz,
}
