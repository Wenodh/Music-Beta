const FlexLayout = ({ children }) => (
    <div className="flex flex-col lg:flex-row lg:justify-center items-center gap-6 lg:gap-24 lg:items-start">
        {children}
    </div>
);

export default FlexLayout;
