# Stylus Build Environment
# Use this Dockerfile to build the WASM contract on Windows

FROM rust:1.75-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    pkg-config \
    libssl-dev \
    binaryen \
    && rm -rf /var/lib/apt/lists/*

# Install specific Rust toolchain
RUN rustup install nightly-2024-02-01 && \
    rustup target add wasm32-unknown-unknown --toolchain nightly-2024-02-01 && \
    rustup default nightly-2024-02-01

# Install cargo-stylus
RUN cargo install cargo-stylus

# Set working directory
WORKDIR /workspace

# Copy project files (will be mounted as volume in practice)
# COPY . .

# Default command
CMD ["bash"]
