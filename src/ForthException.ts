enum ForthException {
	replaces = -79,
	substitute,
	malformedxchar,
	writeline,
	writefile,
	resizefile,
	repositionfile,
	renamefile,
	readline,
	readfile,
	openfile,
	flushfile,
	filestatus,
	filesize,
	fileposition,
	deletefile,
	createfile,
	closefile,
	resize,
	free,
	allocate,
	bracketifelsethen,
	chario,
	quit,
	floatingpointunknown,
	floatingpointunderflow,
	estack_overflow,
	cstack_overflow,
	compilationwordlistchanged,
	searchorderunderflow,
	searchorderoverflow,
	invalidpostpone,
	compilationwordlistdeleted,
	floatingpointinvalidargument,
	fpstack_underflow,
	fpstack_overflow,
	floatingpointoutofrange,
	floatingpointdiv0,
	precisionloss,
	floatingpointinvalidbase,
	unexpectedeof,
	nonexistentfile,
	fileio,
	invalidfileposition,
	invalidblocknumber,
	blockwrite,
	blockread,
	invalidname,
	tobodywithoutcreate,
	obsolete,
	compilernesting,
	userinterrupt,
	invalidrecursion,
	missingloopparameters,
	rstack_imbalance,
	invalidnumber,
	alignment,
	cstack_mismatch,
	unsupported,
	readonly,
	nametoolong,
	parseoverflow,
	picnumoverflow,
	zerolengthname,
	forget,
	compileonlyinterpret,
	undefinedword,
	typemismatch,
	outofrange,
	divzero,
	invalidmem,
	dictionary_overflow,
	dolooptoonested,
	rstack_underflow,
	rstack_overflow,
	stack_underflow,
	stack_overflow,
	aborts,
	abort,
}

export default ForthException;