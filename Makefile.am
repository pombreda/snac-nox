AUTOMAKE_OPTIONS = foreign 1.9.6
ACLOCAL_AMFLAGS = -I config

SUBDIRS = src $(subdirs) doc man

dist-local:
	cd doc/manual && make clean

nox_installsubdir = $(DESTDIR)$(subst src,$(bindir),$(subdir))
install-exec-hook:
	(cd $(DESTDIR)$(bindir) && $(PYTHON) -c "import compileall; compileall.compile_dir('.', force=True)") 
	(cd $(DESTDIR)$(bindir) && find . -name "*.py" -exec rm -f {} \;) 
