import type * as React from "react"
import { Image } from "@/components/chapter/MdxImage"

// === Active components (used in current chapters) ===
import { EnterpriseBaselineViz } from "@/components/visualisations/EnterpriseBaselineViz"
import { TrainingParallelismViz } from "@/components/visualisations/TrainingParallelismViz"
import { NVLinkViz } from "@/components/visualisations/NVLinkViz"
import { AMDvsNVIDIAInterconnectViz } from "@/components/visualisations/AMDvsNVIDIAInterconnectViz"
import { AMDGenerationCompareViz } from "@/components/visualisations/AMDGenerationCompareViz"
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
import { NVMeOFCapsuleViz } from "@/components/visualisations/NVMeOFCapsuleViz"
import { StorageDMAPathViz } from "@/components/visualisations/StorageDMAPathViz"
import { StorageFabricTopologyViz } from "@/components/visualisations/StorageFabricTopologyViz"
import { StorageFrameAnatomyViz } from "@/components/visualisations/StorageFrameAnatomyViz"
import { GDSPathViz } from "@/components/visualisations/GDSPathViz"
import { StorageDiagnosticsViz } from "@/components/visualisations/StorageDiagnosticsViz"
import { ComputeVsStorageFabricViz } from "@/components/visualisations/ComputeVsStorageFabricViz"
import { ThreeFabricMapViz } from "@/components/visualisations/ThreeFabricMapViz"
import { BMCArchitectureViz } from "@/components/visualisations/BMCArchitectureViz"
import { IPMIProtocolViz } from "@/components/visualisations/IPMIProtocolViz"
import { RedfishAPIViz } from "@/components/visualisations/RedfishAPIViz"
import { OOBTopologyViz } from "@/components/visualisations/OOBTopologyViz"
import { SwitchMgmtVsDataViz } from "@/components/visualisations/SwitchMgmtVsDataViz"
import { UFMManagementPlaneViz } from "@/components/visualisations/UFMManagementPlaneViz"
import { BF3ManagementArchViz } from "@/components/visualisations/BF3ManagementArchViz"
import { OOBSecurityViz } from "@/components/visualisations/OOBSecurityViz"
import { AddressFamiliesViz } from "@/components/visualisations/AddressFamiliesViz"
import { PodScaleViz } from "@/components/visualisations/PodScaleViz"
import { RFC1918PartitioningViz } from "@/components/visualisations/RFC1918PartitioningViz"
import { LoopbackAddressingViz } from "@/components/visualisations/LoopbackAddressingViz"
import { PToPLinkViz } from "@/components/visualisations/PToPLinkViz"
import { ServerPrefixViz } from "@/components/visualisations/ServerPrefixViz"
import { ManagementAddressViz } from "@/components/visualisations/ManagementAddressViz"
import { VXLANVNIViz } from "@/components/visualisations/VXLANVNIViz"
import { SuperPodScalingViz } from "@/components/visualisations/SuperPodScalingViz"
import { AddressingMistakesViz } from "@/components/visualisations/AddressingMistakesViz"
// === Ch20 -- Ultra Ethernet Consortium (UEC) ===
import { UECPainPointsViz } from "@/components/visualisations/UECPainPointsViz"
import { UECStackViz } from "@/components/visualisations/UECStackViz"
import { UECPacketFormatViz } from "@/components/visualisations/UECPacketFormatViz"
import { UECReliabilityViz } from "@/components/visualisations/UECReliabilityViz"
import { UECCongestionViz } from "@/components/visualisations/UECCongestionViz"
import { UECMultipathViz } from "@/components/visualisations/UECMultipathViz"
import { UECSwitchCapabilitiesViz } from "@/components/visualisations/UECSwitchCapabilitiesViz"
import { UECDeploymentReadinessViz } from "@/components/visualisations/UECDeploymentReadinessViz"
// === Ch21 -- Congestion Control Deep Dive ===
import JCTSensitivityViz from "@/components/visualisations/JCTSensitivityViz"
import DCQCNStateMachineViz from "@/components/visualisations/DCQCNStateMachineViz"
import SwiftRTTViz from "@/components/visualisations/SwiftRTTViz"
import HPCCINTPacketViz from "@/components/visualisations/HPCCINTPacketViz"
import TIMELYGradientViz from "@/components/visualisations/TIMELYGradientViz"
import CCAlgorithmComparisonViz from "@/components/visualisations/CCAlgorithmComparisonViz"
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
// === Ch22 -- Segment Routing for AI Fabrics ===
import SRv6PacketHeaderViz from "@/components/visualisations/SRv6PacketHeaderViz"
import SRv6SIDViz from "@/components/visualisations/SRv6SIDViz"
import SRTEPolicyViz from "@/components/visualisations/SRTEPolicyViz"
import EVPNSRv6Viz from "@/components/visualisations/EVPNSRv6Viz"
import FlexAlgoPathViz from "@/components/visualisations/FlexAlgoPathViz"
// === Ch23 -- AI Networking Security ===
import RDMAThreatModelViz from "@/components/visualisations/RDMAThreatModelViz"
import SpectrumXTenantIsolationViz from "@/components/visualisations/SpectrumXTenantIsolationViz"
import PKeyMembershipViz from "@/components/visualisations/PKeyMembershipViz"
import UFMCyberAIViz from "@/components/visualisations/UFMCyberAIViz"
// === Ch24 -- Spectrum-X Architecture and the AI Factory Platform ===
import SpectrumXStackViz from "@/components/visualisations/SpectrumXStackViz"
import Spectrum4ASICViz from "@/components/visualisations/Spectrum4ASICViz"
import SuperNICReorderViz from "@/components/visualisations/SuperNICReorderViz"
import ScalableUnitViz from "@/components/visualisations/ScalableUnitViz"
import SpectrumXSoftwareStackViz from "@/components/visualisations/SpectrumXSoftwareStackViz"
import GPUCommPatternViz from "@/components/visualisations/GPUCommPatternViz"
import StorageOptionComparisonViz from "@/components/visualisations/StorageOptionComparisonViz"
import FailureDomainViz from "@/components/visualisations/FailureDomainViz"
// === Ch25 -- RoCE Configuration and Operations on Spectrum-X ===
import RoCEPrereqChecklistViz from "@/components/visualisations/ch25/RoCEPrereqChecklistViz"
import NVUERoCEConfigViz from "@/components/visualisations/ch25/NVUERoCEConfigViz"
import QoSSchedulerViz from "@/components/visualisations/ch25/QoSSchedulerViz"
import ECNThresholdViz from "@/components/visualisations/ch25/ECNThresholdViz"
import PFCStormProgressionViz from "@/components/visualisations/ch25/PFCStormProgressionViz"
import RoCEVerificationFlowViz from "@/components/visualisations/ch25/RoCEVerificationFlowViz"
import RoCEScenarioTroubleshootViz from "@/components/visualisations/ch25/RoCEScenarioTroubleshootViz"
// === Ch26 -- Adaptive Routing and Per-Packet Spraying on Spectrum-X ===
import ECMPCollisionViz from "@/components/visualisations/ch26/ECMPCollisionViz"
import AdaptiveRoutingEngineViz from "@/components/visualisations/ch26/AdaptiveRoutingEngineViz"
import SuperNICReorderBufferViz from "@/components/visualisations/ch26/SuperNICReorderBufferViz"

// === Legacy components (no longer in active chapters, kept for reference) ===
// ServerRackViz, NICCardViz, DGXNodeViz, HardwareComparison
// These files remain in components/visualisations/ but are not registered

export const mdxComponents: Record<string, React.ComponentType<any>> = {
  Image: Image as unknown as React.ComponentType<any>,
  EnterpriseBaselineViz,
  TrainingParallelismViz,
  NVLinkViz,
  AMDvsNVIDIAInterconnectViz,
  AMDGenerationCompareViz,
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
  NVMeOFCapsuleViz,
  StorageDMAPathViz,
  StorageFabricTopologyViz,
  StorageFrameAnatomyViz,
  GDSPathViz,
  StorageDiagnosticsViz,
  ComputeVsStorageFabricViz,
  ThreeFabricMapViz,
  BMCArchitectureViz,
  IPMIProtocolViz,
  RedfishAPIViz,
  OOBTopologyViz,
  SwitchMgmtVsDataViz,
  UFMManagementPlaneViz,
  BF3ManagementArchViz,
  OOBSecurityViz,
  AddressFamiliesViz,
  PodScaleViz,
  RFC1918PartitioningViz,
  LoopbackAddressingViz,
  PToPLinkViz,
  ServerPrefixViz,
  ManagementAddressViz,
  VXLANVNIViz,
  SuperPodScalingViz,
  AddressingMistakesViz,
  LeafSwitchProcessingViz,
  SpineForwardingViz,
  DestinationNICDeliveryViz,
  IBvsRoCEPacketViz,
  AlternativeNICStackViz,
  FabricComparisonMatrixViz,
  ProductionDebugMapViz,
  // Ch20
  UECPainPointsViz,
  UECStackViz,
  UECPacketFormatViz,
  UECReliabilityViz,
  UECCongestionViz,
  UECMultipathViz,
  UECSwitchCapabilitiesViz,
  UECDeploymentReadinessViz,
  // Ch21
  JCTSensitivityViz,
  DCQCNStateMachineViz,
  SwiftRTTViz,
  HPCCINTPacketViz,
  TIMELYGradientViz,
  CCAlgorithmComparisonViz,
  // Ch22
  SRv6PacketHeaderViz,
  SRv6SIDViz,
  SRTEPolicyViz,
  EVPNSRv6Viz,
  FlexAlgoPathViz,
  // Ch23
  RDMAThreatModelViz,
  SpectrumXTenantIsolationViz,
  PKeyMembershipViz,
  UFMCyberAIViz,
  // Ch24
  SpectrumXStackViz,
  Spectrum4ASICViz,
  SuperNICReorderViz,
  ScalableUnitViz,
  SpectrumXSoftwareStackViz,
  GPUCommPatternViz,
  StorageOptionComparisonViz,
  FailureDomainViz,
  // Ch25
  RoCEPrereqChecklistViz,
  NVUERoCEConfigViz,
  QoSSchedulerViz,
  ECNThresholdViz,
  PFCStormProgressionViz,
  RoCEVerificationFlowViz,
  RoCEScenarioTroubleshootViz,
  // Ch26
  ECMPCollisionViz,
  AdaptiveRoutingEngineViz,
  SuperNICReorderBufferViz,
}
