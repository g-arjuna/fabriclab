# QEMU/KVM runner used when the host kernel cannot provide per-netns RXE.
# The container only packages the VM toolchain; the RDMA data plane remains
# inside two isolated Ubuntu KVM guests.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        cloud-image-utils \
        curl \
        iproute2 \
        iputils-ping \
        openssh-client \
        ovmf \
        python3 \
        qemu-system-x86 \
        qemu-utils \
        tcpdump \
        tshark \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*
