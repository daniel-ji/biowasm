#!/bin/bash
cd src/

UTILS=$(echo src/{basename,cat,chmod,comm,cp,cut,date,echo,env,fold,head,hostname,join,ls,md5sum,mkdir,mktemp,mv,nproc,paste,pwd,rm,rmdir,seq,shuf,sort,tail,touch,tr,uniq,wc}.js)
# Install dependencies
sudo apt-get install -y autopoint gperf help2man gettext texinfo bison
./bootstrap

# Nanosleep not supported in Emscripten
sed -i 's|if ${gl_cv_func_sleep_works+:} false|if true|g' configure
sed -i 's|if ${ac_cv_search_nanosleep+:} false|if true|g' configure
sed -i 's|if ${gl_cv_func_nanosleep+:} false|if true|g' configure

# Configure (--disable-nls to avoid Memory out of bounds error)
emconfigure ./configure \
  CC=emcc \
  --disable-nls \
  FORCE_UNSAFE_CONFIGURE=1 \
  TIME_T_32_BIT_OK=yes \
  --host=wasm32

# This program needs gcc and should not be compiled to WebAssembly
sed -i 's|$(MAKE) src/make-prime-list$(EXEEXT)|gcc src/make-prime-list.c -o src/make-prime-list$(EXEEXT) -Ilib/|' Makefile

# Make all commands and skip "man" errors
# When update this list, need to update tools.json
emmake make all CC=emcc -k WERROR_CFLAGS=""
emmake make $UTILS \
  CC=emcc EXEEXT=.js \
  CFLAGS="-O2 $EM_FLAGS" \
  -k WERROR_CFLAGS=""

# Don't throw error for unsupported features
sed -i 's/throw\("[a-z]*: TODO"\)/console.warn(\1)/g' src/*.js

# Move .js/.wasm files to build folder
mv $UTILS ../build/
mv ${UTILS//.js/.wasm} ../build/
