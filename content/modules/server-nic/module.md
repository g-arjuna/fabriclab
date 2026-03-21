# Server Anatomy and NIC in HPC

## Learning Objective
Understand how server hardware, NICs, and traffic flow fit together before troubleshooting congestion behavior in the lab.

## Inside a Server
@visual Server Hardware Layout
- A server contains CPU, memory, storage, and PCIe slots
- PCIe slots are used to attach high-speed devices
- Network cards are installed in PCIe slots
- In HPC, servers are optimized for high throughput and low latency

## What is a NIC?
@visual NIC Card with High-Speed Ports
- A NIC connects a server to the network
- It provides high-speed ports such as 25G, 100G, or 400G
- In HPC, NICs support RDMA for low latency communication
- NICs are critical for moving data between servers in a cluster

## Traffic Flow in HPC
@visual Server to Network Traffic Flow
- Applications send data through the NIC
- Data leaves the server and enters the network fabric
- At high speeds, congestion can occur
- Loss or delay in packets can severely impact performance

## Bridge
In high-speed networks, congestion must be controlled. Mechanisms like Priority Flow Control (PFC) help preserve lossless behavior. In the next lab, you will fix a misconfigured PFC setting.

## Lab
lab-pfc-1
Fix PFC Configuration
