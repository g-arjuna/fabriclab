# rdma-lab node image — Ubuntu 24.04 LTS + RDMA userspace.
#
# NOTE: installing this image inside Containerlab nodes will NOT give
# working RDMA on current kernels (see topo.clab.yml comment).  The
# image is still useful for the two-VM lab if you prefer to bake the
# dependencies in instead of installing at boot.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3-pyverbs \
        ibverbs-utils \
        rdma-core \
        iproute2 \
        iputils-ping \
        tcpdump \
        tshark \
        kmod \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*
